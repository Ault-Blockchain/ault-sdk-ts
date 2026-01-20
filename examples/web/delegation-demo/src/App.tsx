import { useState, useEffect, useCallback, useRef } from "react";
import {
  createClient,
  getNetworkConfig,
  evmToAult,
  isValidAultAddress,
  isValidEvmAddress,
  type Client,
  SDK_VERSION,
} from "ault-sdk-ts";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const NETWORK = getNetworkConfig("ault_10904-1");
const LICENSE_BATCH_SIZE = 8;

const SDK_SNIPPET = `import { createClient, getNetworkConfig } from "ault-sdk-ts";

const network = getNetworkConfig("ault_10904-1");
const [evmAddress] = (await window.ethereum.request({
  method: "eth_requestAccounts",
})) as string[];
const operator = "ault1...";

const client = await createClient({
  network,
  signer: {
    type: "eip1193",
    provider: window.ethereum,
    address: evmAddress,
  },
});

const { license_ids } = await client.license.getLicensesByOwnerAll(client.address);
const { delegation } = await client.miner.getLicenseDelegation(license_ids[0]);

await client.delegateMining({ licenseIds: license_ids, operator });`;

type BannerTone = "info" | "success" | "error";

interface Banner {
  tone: BannerTone;
  message: string;
}

interface LicenseWithDelegation {
  id: string;
  isDelegated: boolean;
  operator: string | null;
}

export default function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [aultAddress, setAultAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [licenses, setLicenses] = useState<LicenseWithDelegation[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);

  const [operatorAddress, setOperatorAddress] = useState("");
  const [processingAction, setProcessingAction] = useState<"delegate" | "undelegate" | null>(null);

  const [banner, setBanner] = useState<Banner | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const loadTokenRef = useRef(0);

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const isProcessing = processingAction !== null;

  const operatorTrimmed = operatorAddress.trim();
  const operatorIsValid =
    operatorTrimmed.length > 0 &&
    (isValidAultAddress(operatorTrimmed) || isValidEvmAddress(operatorTrimmed));
  const normalizedOperator = operatorIsValid
    ? isValidEvmAddress(operatorTrimmed)
      ? evmToAult(operatorTrimmed)
      : operatorTrimmed
    : null;

  const undelegatedCount = licenses.filter((l) => !l.isDelegated).length;
  const delegatedCount = licenses.filter((l) => l.isDelegated).length;

  const resetSession = useCallback((message?: string) => {
    loadTokenRef.current += 1;
    setClient(null);
    setEvmAddress(null);
    setAultAddress(null);
    setLicenses([]);
    setIsLoadingLicenses(false);
    setProcessingAction(null);
    setLastTxHash(null);
    setBanner(message ? { tone: "info", message } : null);
  }, []);

  const buildClient = useCallback(async (evmAddr: string) => {
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }

    return createClient({
      network: NETWORK,
      signer: {
        type: "eip1193",
        provider: window.ethereum,
        address: evmAddr,
      },
    });
  }, []);

  const applyClient = useCallback((newClient: Client, evmAddr: string) => {
    loadTokenRef.current += 1;
    setClient(newClient);
    setEvmAddress(evmAddr);
    setAultAddress(newClient.address);
    setLicenses([]);
    setLastTxHash(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const op = params.get("operator");
    if (op) setOperatorAddress(op);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const next = Array.isArray(accounts) ? accounts[0] : undefined;
      if (!next) {
        resetSession("Wallet disconnected.");
        return;
      }

      setIsConnecting(true);
      setBanner({ tone: "info", message: "Account changed. Reconnecting..." });

      buildClient(next)
        .then((newClient) => {
          applyClient(newClient, next);
          setBanner({ tone: "success", message: "Wallet reconnected." });
        })
        .catch((err) => {
          resetSession(err instanceof Error ? err.message : "Failed to reconnect wallet.");
        })
        .finally(() => setIsConnecting(false));
    };

    const handleChainChanged = () => {
      resetSession("Network changed. Reconnect your wallet.");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [applyClient, buildClient, resetSession]);

  const loadLicenses = useCallback(
    async (source: "auto" | "manual" = "manual") => {
      if (!client) return;

      const loadId = ++loadTokenRef.current;
      setIsLoadingLicenses(true);
      if (source === "manual") setBanner(null);

      try {
        const { license_ids } = await client.license.getLicensesByOwnerAll(client.address);

        const results: LicenseWithDelegation[] = [];
        const failures: string[] = [];

        for (let i = 0; i < license_ids.length; i += LICENSE_BATCH_SIZE) {
          const batch = license_ids.slice(i, i + LICENSE_BATCH_SIZE);
          const settled = await Promise.allSettled(
            batch.map(async (id) => {
              const { delegation, is_delegated } = await client.miner.getLicenseDelegation(id);
              return {
                id,
                isDelegated: is_delegated,
                operator: delegation?.operator ?? null,
              };
            })
          );

          if (loadId !== loadTokenRef.current) return;

          settled.forEach((result, index) => {
            if (result.status === "fulfilled") {
              results.push(result.value);
            } else {
              failures.push(batch[index]);
            }
          });
        }

        if (loadId !== loadTokenRef.current) return;

        setLicenses(results);

        if (license_ids.length === 0) {
          setBanner({ tone: "info", message: "No licenses found for this address." });
        } else if (failures.length > 0) {
          setBanner({
            tone: "info",
            message: `Loaded ${results.length} licenses. ${failures.length} failed to load delegation status.`,
          });
        } else if (source === "manual") {
          setBanner({ tone: "success", message: `Loaded ${results.length} licenses.` });
        }
      } catch (err) {
        if (loadId !== loadTokenRef.current) return;
        setBanner({
          tone: "error",
          message: err instanceof Error ? err.message : "Failed to load licenses",
        });
      } finally {
        if (loadId === loadTokenRef.current) setIsLoadingLicenses(false);
      }
    },
    [client]
  );

  useEffect(() => {
    if (client) {
      void loadLicenses("auto");
    }
  }, [client, loadLicenses]);

  async function connect() {
    if (!window.ethereum) {
      setBanner({ tone: "error", message: "MetaMask not found. Please install MetaMask." });
      return;
    }

    setIsConnecting(true);
    setBanner(null);
    setLastTxHash(null);

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setBanner({ tone: "error", message: "No accounts found. Please unlock MetaMask." });
        return;
      }

      const newClient = await buildClient(accounts[0]);
      applyClient(newClient, accounts[0]);
      setBanner({ tone: "success", message: "Wallet connected." });
    } catch (err) {
      setBanner({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to connect wallet",
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function delegateAll() {
    if (!client) return;

    if (!normalizedOperator) {
      setBanner({ tone: "error", message: "Enter a valid operator address." });
      return;
    }

    const undelegatedIds = licenses.filter((l) => !l.isDelegated).map((l) => l.id);

    if (undelegatedIds.length === 0) {
      setBanner({ tone: "info", message: "No undelegated licenses to delegate." });
      return;
    }

    setProcessingAction("delegate");
    setBanner(null);
    setLastTxHash(null);

    try {
      const result = await client.delegateMining({
        licenseIds: undelegatedIds,
        operator: normalizedOperator,
      });

      if (result.success) {
        setLastTxHash(result.txHash);
        setBanner({
          tone: "success",
          message: `Delegated ${undelegatedIds.length} license${undelegatedIds.length === 1 ? "" : "s"}.`,
        });
        await loadLicenses("auto");
      } else {
        setBanner({
          tone: "error",
          message: `Transaction failed: ${result.rawLog || "Unknown error"}`,
        });
      }
    } catch (err) {
      setBanner({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to delegate",
      });
    } finally {
      setProcessingAction(null);
    }
  }

  async function undelegateAll() {
    if (!client) return;

    const delegatedIds = licenses.filter((l) => l.isDelegated).map((l) => l.id);

    if (delegatedIds.length === 0) {
      setBanner({ tone: "info", message: "No delegated licenses to undelegate." });
      return;
    }

    setProcessingAction("undelegate");
    setBanner(null);
    setLastTxHash(null);

    try {
      const result = await client.cancelMiningDelegation({
        licenseIds: delegatedIds,
      });

      if (result.success) {
        setLastTxHash(result.txHash);
        setBanner({
          tone: "success",
          message: `Undelegated ${delegatedIds.length} license${delegatedIds.length === 1 ? "" : "s"}.`,
        });
        await loadLicenses("auto");
      } else {
        setBanner({
          tone: "error",
          message: `Transaction failed: ${result.rawLog || "Unknown error"}`,
        });
      }
    } catch (err) {
      setBanner({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to undelegate",
      });
    } finally {
      setProcessingAction(null);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Ault SDK - React Example</p>
          <h1>License Delegation</h1>
          <p className="lede">
            A clear, end-to-end example of using <span className="mono">createClient()</span> in
            React for REST reads and delegation transactions.
          </p>
          <div className="hero-actions">
            {!hasWallet ? (
              <button className="ghost" disabled>
                MetaMask required
              </button>
            ) : !client ? (
              <button className="primary" onClick={connect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            ) : (
              <button className="ghost" onClick={() => resetSession("Session reset.")}>
                Reset session
              </button>
            )}
          </div>
        </div>

        <div className="hero-meta">
          <div className="meta-card">
            <span className="meta-label">Network</span>
            <span className="meta-value">{NETWORK.name}</span>
            <span className="meta-sub">{NETWORK.chainId}</span>
          </div>
          <div className="meta-card">
            <span className="meta-label">REST endpoint</span>
            <span className="meta-value mono">{NETWORK.restUrl}</span>
          </div>
          <div className="meta-card">
            <span className="meta-label">SDK version</span>
            <span className="meta-value">v{SDK_VERSION}</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel guide">
          <div className="panel-header">
            <h2>How it works</h2>
            <span className="pill">3 steps</span>
          </div>
          <ol className="steps">
            <li>
              Connect an EIP-1193 wallet and create a client with{" "}
              <span className="mono">createClient()</span>.
            </li>
            <li>
              Load owned licenses via{" "}
              <span className="mono">client.license.getLicensesByOwnerAll</span> and then fetch
              delegation details per license.
            </li>
            <li>
              Delegate or cancel delegation with <span className="mono">client.delegateMining</span>{" "}
              and <span className="mono">client.cancelMiningDelegation</span>.
            </li>
          </ol>

          <div className="code-block">
            <div className="code-title">SDK calls used in this demo</div>
            <pre className="code">
              <code>{SDK_SNIPPET}</code>
            </pre>
          </div>

          <div className="tip">
            Tip: preload the operator with <span className="mono">?operator=</span> in the URL.
          </div>
        </section>

        <section className="panel demo">
          <div className="panel-header">
            <h2>Live demo</h2>
            <span className="pill">{licenses.length} licenses</span>
          </div>

          {banner && (
            <div className={`banner ${banner.tone}`}>
              <span>{banner.message}</span>
              <button className="dismiss" onClick={() => setBanner(null)} aria-label="Dismiss">
                x
              </button>
            </div>
          )}

          {!client ? (
            <div className="empty-state">
              <p className="muted">Connect your wallet to fetch licenses and manage delegation.</p>
              <button className="primary" onClick={connect} disabled={!hasWallet || isConnecting}>
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            </div>
          ) : (
            <>
              <div className="wallet-card">
                <div>
                  <span className="meta-label">EVM address</span>
                  <span className="mono">{evmAddress}</span>
                </div>
                <div>
                  <span className="meta-label">Ault address</span>
                  <span className="mono accent">{aultAddress}</span>
                </div>
              </div>

              <div className="stats">
                <div className="stat-card">
                  <span className="meta-label">Total</span>
                  <span className="stat-value">{licenses.length}</span>
                </div>
                <div className="stat-card">
                  <span className="meta-label">Delegated</span>
                  <span className="stat-value">{delegatedCount}</span>
                </div>
                <div className="stat-card">
                  <span className="meta-label">Undelegated</span>
                  <span className="stat-value">{undelegatedCount}</span>
                </div>
              </div>

              <section className="licenses">
                <div className="section-header">
                  <h3>Licenses</h3>
                  <button
                    className="ghost"
                    onClick={() => loadLicenses("manual")}
                    disabled={isLoadingLicenses}
                  >
                    {isLoadingLicenses ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {isLoadingLicenses ? (
                  <p className="muted">Loading licenses...</p>
                ) : licenses.length === 0 ? (
                  <p className="muted">No licenses found for this address.</p>
                ) : (
                  <table className="license-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((license) => (
                        <tr key={license.id}>
                          <td className="mono">{license.id}</td>
                          <td>
                            <span
                              className={`status ${license.isDelegated ? "delegated" : "undelegated"}`}
                            >
                              {license.isDelegated ? "Delegated" : "Undelegated"}
                            </span>
                          </td>
                          <td className="operator-cell">
                            {license.operator ? (
                              <span className="mono">{license.operator}</span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="delegate-section">
                <h3>Delegate mining</h3>
                <label htmlFor="operator">Operator address</label>
                <input
                  id="operator"
                  type="text"
                  placeholder="ault1... or 0x..."
                  value={operatorAddress}
                  onChange={(e) => setOperatorAddress(e.target.value)}
                  disabled={isProcessing}
                />

                {operatorTrimmed.length > 0 && !operatorIsValid && (
                  <p className="helper error">Enter a valid Ault or EVM address.</p>
                )}

                {normalizedOperator && normalizedOperator !== operatorTrimmed && (
                  <p className="helper">
                    Normalized to <span className="mono">{normalizedOperator}</span>
                  </p>
                )}

                <div className="actions">
                  <button
                    className="primary"
                    onClick={delegateAll}
                    disabled={isProcessing || !operatorIsValid || undelegatedCount === 0}
                  >
                    {processingAction === "delegate"
                      ? "Delegating..."
                      : `Delegate all (${undelegatedCount})`}
                  </button>
                  <button
                    className="secondary"
                    onClick={undelegateAll}
                    disabled={isProcessing || delegatedCount === 0}
                  >
                    {processingAction === "undelegate"
                      ? "Undelegating..."
                      : `Undelegate all (${delegatedCount})`}
                  </button>
                </div>
              </section>

              {lastTxHash && (
                <div className="tx-card">
                  <span className="meta-label">Last tx hash</span>
                  <span className="mono">{lastTxHash}</span>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

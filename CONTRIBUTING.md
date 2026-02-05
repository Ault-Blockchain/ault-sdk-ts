# Contributing to Ault SDK

Thank you for your interest in contributing to the Ault SDK for TypeScript.

## Development Setup

### Prerequisites

- Node.js 18+ or Bun
- pnpm (see `packageManager` in package.json for exact version)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Ault-Blockchain/ault-sdk-ts.git
cd ault-sdk-ts

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

### Proto Generation

Proto generation requires the Ault core repo and Cosmos SDK to be checked out alongside this repo:

```
../ault/proto
../cosmos-sdk/proto
```

To regenerate protos:

```bash
pnpm gen:proto
pnpm gen:eip712
```

Note: You typically don't need to regenerate protos unless the upstream proto definitions change.

## Making Changes

### Code Style

This project uses:
- **oxlint** for linting
- **oxfmt** for formatting
- **TypeScript** with strict mode enabled

Pre-commit hooks will automatically lint and format staged files.

To manually run checks:

```bash
pnpm lint        # Run linter
pnpm lint:fix    # Auto-fix lint issues
pnpm format      # Format code
pnpm typecheck   # Type check
```

### Testing

```bash
pnpm test        # Run all tests
pnpm test:e2e    # Run E2E tests (requires AULT_TEST_PRIVATE_KEY)
```

E2E tests require a test private key with funds on testnet. Set `AULT_TEST_PRIVATE_KEY` in your environment or `.env` file.

### Commit Messages

Write clear, concise commit messages that describe the change. Use imperative mood ("Add feature" not "Added feature").

Examples:
- `Add batch mint support to license module`
- `Fix address conversion for checksummed addresses`
- `Update EIP-712 types for new message format`

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure tests pass (`pnpm test`)
5. Ensure linting passes (`pnpm lint`)
6. Commit your changes
7. Push to your fork
8. Open a Pull Request

### PR Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Update documentation if needed
- Ensure CI passes before requesting review

## Reporting Issues

When reporting bugs, please include:

- SDK version
- Node.js/Bun version
- Minimal reproduction code
- Expected vs actual behavior
- Error messages/stack traces

## Questions

For questions about contributing, open a GitHub issue with the `question` label.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

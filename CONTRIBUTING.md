# NextCollect Contributing Guide

## Prerequisites

NextCollect requires `pnpm` (>3) and `node` (>14).

## Commands

* `pnpm install` - to install all dependencies
* `pnpm uninstall` - to uninstall all dependencies. It removes all `node_modules`, please 
run `pnpm install` after that.
* `pnpm dev` - starts demo application. Open https://localhost:3000/ in your browser.
* `pnpm build` - builds demo application

## Releasing

* `pnpm canary:publish` creates a new canary release. 
* `pnpm release --version 0.2.1 --publish` creates a new stable release. *Dry run with `pnpm release --version 0.2.1` first!*



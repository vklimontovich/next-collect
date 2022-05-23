# NextCollect Contributing Guide

## Prerequisites

NextCollect requires `pnpm` (>3) and `node` (>14).

## Commands

* `pnpm install` - to install all dependencies
* `pnpm uninstall` - to uninstall all dependencies. It removes all `node_modules`, please 
run `pnpm install` after that.
* `pnmp dev` - starts demo application. Open https://localhost:3000/ in your browser.
* `pnpm build` - builds demo application

## Releasing

`pnpm release --publish`. Creates a new release. So far it supports only canary releases.



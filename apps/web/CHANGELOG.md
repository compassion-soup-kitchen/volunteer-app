# Changelog

## [1.3.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.2.1...v1.3.0) (2026-06-26)


### Features

* add a living /styleguide route ([1193a48](https://github.com/compassion-soup-kitchen/volunteer-app/commit/1193a48183c06988575dcf17e3b4cf4603872e46))


### Bug Fixes

* reverse the wordmark to white in dark mode ([dc7f24d](https://github.com/compassion-soup-kitchen/volunteer-app/commit/dc7f24d10d2f9524d1aba94e5bf245d548760edb))

## [1.2.1](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.2.0...v1.2.1) (2026-06-25)


### Bug Fixes

* migrate Calendar/DatePicker to react-day-picker v10 API ([753b89b](https://github.com/compassion-soup-kitchen/volunteer-app/commit/753b89b86e9eb616d29fbac1fe37b257c46898bf))

## [1.2.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.1.0...v1.2.0) (2026-05-20)


### Features

* add Docker HEALTHCHECK using /api/health/ready ([29e2d52](https://github.com/compassion-soup-kitchen/volunteer-app/commit/29e2d52ef03b6451b29a7ba6a6f92370bd6a1fab))
* add liveness and readiness health check endpoints ([d384769](https://github.com/compassion-soup-kitchen/volunteer-app/commit/d384769fb330d07ab2e36713a18f71e7d7c90fbb))
* add liveness and readiness health check endpoints ([e97654c](https://github.com/compassion-soup-kitchen/volunteer-app/commit/e97654c9fb16b0dd0356e2052c5207ec701b6c82))


### Bug Fixes

* copy pnpm-workspace.yaml into Docker builder ([#31](https://github.com/compassion-soup-kitchen/volunteer-app/issues/31)) ([adc49aa](https://github.com/compassion-soup-kitchen/volunteer-app/commit/adc49aac3aab785db19adb5b063305c3dcdc9e7b))
* **docker:** bump base image to node:22-alpine for pnpm 11 ([#30](https://github.com/compassion-soup-kitchen/volunteer-app/issues/30)) ([bc99908](https://github.com/compassion-soup-kitchen/volunteer-app/commit/bc999084d9830a0bcc513e324ea759f6a4f99ac5))
* **docker:** use 127.0.0.1 in healthcheck to bypass IPv6 lookup ([#33](https://github.com/compassion-soup-kitchen/volunteer-app/issues/33)) ([f086da5](https://github.com/compassion-soup-kitchen/volunteer-app/commit/f086da54202b684449342b8bd4ae3d237409a304))
* pin HOSTNAME=0.0.0.0 in runtime image so healthcheck can connect ([82e9ace](https://github.com/compassion-soup-kitchen/volunteer-app/commit/82e9ace8149fc170c459e99b3f0a84585579874e))
* pin HOSTNAME=0.0.0.0 so the container healthcheck can connect ([0090b69](https://github.com/compassion-soup-kitchen/volunteer-app/commit/0090b691101502d064d2ff4d5d851fc3a398eca5))

## [1.1.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.0.1...v1.1.0) (2026-05-07)


### Features

* add Dockerfile for production build and standalone output configuration ([f9f4b98](https://github.com/compassion-soup-kitchen/volunteer-app/commit/f9f4b989fd3ae2c9c808ff261815de0135adfb9b))
* implement S3-compatible storage for document uploads and management ([5b9cda2](https://github.com/compassion-soup-kitchen/volunteer-app/commit/5b9cda2d81999213bcda8b6a0432468424eef15f))


### Bug Fixes

* update database connection string in Prisma seed file ([e02e6e8](https://github.com/compassion-soup-kitchen/volunteer-app/commit/e02e6e898057a875590c61f8c87a65f88a7b30df))
* update Dockerfile to include full node_modules for Prisma CLI migration ([5080376](https://github.com/compassion-soup-kitchen/volunteer-app/commit/50803768c80c37000ccb516b3bed98b5a9dcedd3))
* update Prisma CLI invocation in Dockerfile for proper migration deployment ([7a79a02](https://github.com/compassion-soup-kitchen/volunteer-app/commit/7a79a022ee88907147fd403b77e95cc7e87c6512))

## [1.0.1](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.0.0...v1.0.1) (2026-05-01)


### Bug Fixes

* **eslint:** pin React version to unblock ESLint 10 upgrade ([13af12b](https://github.com/compassion-soup-kitchen/volunteer-app/commit/13af12bcbfe430d4050b81aba3849cc9cfcd195f))

## 1.0.0 (2026-05-01)


### Bug Fixes

* **lint:** resolve all eslint errors and warnings ([bbf7214](https://github.com/compassion-soup-kitchen/volunteer-app/commit/bbf72140ba7f9dc73941eb5921b22bf999f1e69c))

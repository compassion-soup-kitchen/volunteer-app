# Changelog

## [1.9.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.8.0...v1.9.0) (2026-07-23)


### Features

* **volunteers:** show not-yet-applied users and allow direct promotion ([c0b24b7](https://github.com/compassion-soup-kitchen/volunteer-app/commit/c0b24b7cdd91f40aa898560032b6f1e2d7f460a8))


### Bug Fixes

* **documents:** exclude staff from agreement-overview volunteer counts ([b0a5fc5](https://github.com/compassion-soup-kitchen/volunteer-app/commit/b0a5fc5f59c9e586cef678b782c40e472fc53b1e))
* **volunteers:** exclude staff from volunteer counts; unit-test list filter ([6ebf16c](https://github.com/compassion-soup-kitchen/volunteer-app/commit/6ebf16c33f1cd07c69a8342f2e627178dadcb0d6))

## [1.8.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.7.0...v1.8.0) (2026-07-22)


### Features

* email preview page; gate verification behind confirm click ([1e272dd](https://github.com/compassion-soup-kitchen/volunteer-app/commit/1e272ddb6e065ccd95277753728c9615c512b184))
* let admins change volunteer roles from the directory ([219955a](https://github.com/compassion-soup-kitchen/volunteer-app/commit/219955af20e4101ca481635147b2d87f276e0f5d))
* let admins change volunteer roles from the directory ([19c268c](https://github.com/compassion-soup-kitchen/volunteer-app/commit/19c268c6d006a598874b7a1319814a4369928cde))
* require email verification for new registrations ([fe821ac](https://github.com/compassion-soup-kitchen/volunteer-app/commit/fe821ac5b0049df128ac7cb2e2e02d5d6595a195))
* require email verification for new registrations ([4877723](https://github.com/compassion-soup-kitchen/volunteer-app/commit/4877723eb5c5d7e3419c92cae3dac5db073364dc))
* **web:** cross-link info pages and mention password reset in support FAQ ([66dd121](https://github.com/compassion-soup-kitchen/volunteer-app/commit/66dd1216ca31b862c65790471fcdd78b15cfa65c))


### Bug Fixes

* block role changes on still-PUBLIC pending applicants ([c33316e](https://github.com/compassion-soup-kitchen/volunteer-app/commit/c33316e08d88506db7944fc0c2b092e66d527eb2))
* close last-admin TOCTOU race with a serializable transaction ([f875b5a](https://github.com/compassion-soup-kitchen/volunteer-app/commit/f875b5a5d9e09ecc149710ad93930d4fb90a94e8))
* enforce archived-account role guardrail server-side; test last-admin logic ([b0af6af](https://github.com/compassion-soup-kitchen/volunteer-app/commit/b0af6af768d755b8277c2adbfa2b995413374b94))

## [1.7.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.6.0...v1.7.0) (2026-07-21)


### Features

* **announcements:** staff can create, publish, and manage panui ([85739d9](https://github.com/compassion-soup-kitchen/volunteer-app/commit/85739d9a9eb54aa0e77276cff769fb3d2cb584ca))
* **public:** error boundaries, privacy statement, landing CTA fixes ([e433796](https://github.com/compassion-soup-kitchen/volunteer-app/commit/e4337968a9d292a29a11174ba87e309464f6521b))

## [1.6.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.5.0...v1.6.0) (2026-07-21)


### Features

* **web:** add public support and copyright pages ([72557a2](https://github.com/compassion-soup-kitchen/volunteer-app/commit/72557a27da57d4c90a32f94838caf27b41fb32f9))

## [1.5.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.4.0...v1.5.0) (2026-07-06)


### Features

* push notifications via Expo for the mobile app ([6ee0a66](https://github.com/compassion-soup-kitchen/volunteer-app/commit/6ee0a661edb4e01b5455fdc890bfef650b60c8b2))


### Bug Fixes

* anchor shift-change day boundary to UTC ([b80ccc9](https://github.com/compassion-soup-kitchen/volunteer-app/commit/b80ccc933b84a9dc3a2ef7c882100227ddcb15b6))
* format shift-change notification day in UTC ([948edae](https://github.com/compassion-soup-kitchen/volunteer-app/commit/948edae1a04ed58ac0df8c77270d6308ebf7b57e))
* harden push sending and use a Platform enum ([2f75c39](https://github.com/compassion-soup-kitchen/volunteer-app/commit/2f75c39c4dbb7e98216e3a759d845c9f8f1719d7))
* keep updateShift's pre-update lookup inside try/catch ([f763b53](https://github.com/compassion-soup-kitchen/volunteer-app/commit/f763b53abe35162b27d559844b647d16988d0851))
* notify volunteers about same-day shift edits ([a5ad661](https://github.com/compassion-soup-kitchen/volunteer-app/commit/a5ad661733beaea064f8bd21fea34efd63f509b0))

## [1.4.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.3.1...v1.4.0) (2026-07-05)


### Features

* **api:** serve the mobile app from the web app via /api/v1 ([11c38c3](https://github.com/compassion-soup-kitchen/volunteer-app/commit/11c38c37b985d535c163030df55a6838e2e7c05f))

## [1.3.1](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.3.0...v1.3.1) (2026-06-29)


### Bug Fixes

* **mobile:** pin react to 19.2.3 to match RN renderer (fixes launch crash) ([2056507](https://github.com/compassion-soup-kitchen/volunteer-app/commit/2056507d4ea3bcec0a4471d65c7fdf0a8ad0ec62))
* **mobile:** pin react to 19.2.3 to match RN renderer (fixes TestFlight launch crash) ([0547455](https://github.com/compassion-soup-kitchen/volunteer-app/commit/05474557b704a463c73f62d9474bb860d2aa7ab0))

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

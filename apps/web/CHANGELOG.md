# Changelog

## [1.11.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.10.0...v1.11.0) (2026-07-28)


### Features

* **web:** give staff a real dropzone for uploading files ([2a5c41e](https://github.com/compassion-soup-kitchen/volunteer-app/commit/2a5c41e485f906d1b9334c8ae7f21247fbf8860b))
* **web:** move document storage to Cloudflare R2 ([720d70c](https://github.com/compassion-soup-kitchen/volunteer-app/commit/720d70ce18aa93c8a84081f4d6585afec6510a7d))
* **web:** name the crews with volunteer groups ([c14aae6](https://github.com/compassion-soup-kitchen/volunteer-app/commit/c14aae6db5a5d6ec477ccbb25ba8497e5f4ea1cb))
* **web:** permanently delete user accounts ([28478ae](https://github.com/compassion-soup-kitchen/volunteer-app/commit/28478aebfa8f6c028e6529ff0112f7c4b24a2a2c))
* **web:** permanently delete user accounts ([358639e](https://github.com/compassion-soup-kitchen/volunteer-app/commit/358639e17ea3c4ab4c9f24019d81e77d09e51206))
* **web:** training types, bulk shifts, pānui files, monthly export ([0824896](https://github.com/compassion-soup-kitchen/volunteer-app/commit/082489613f33ca750952c21f9b8ca73e1008f07b))
* **web:** volunteer groups - make it clear who the team leaders and guardian angels are ([25bb18e](https://github.com/compassion-soup-kitchen/volunteer-app/commit/25bb18e0fc15f6e999400729160b0d427a335873))


### Bug Fixes

* **web:** apply NZ time consistently to dates across the app ([92e8fa3](https://github.com/compassion-soup-kitchen/volunteer-app/commit/92e8fa3bbbf22a76592f3227739092f7545482b3))
* **web:** bound the new-volunteer count in NZ time, not UTC ([9a32c6a](https://github.com/compassion-soup-kitchen/volunteer-app/commit/9a32c6aeffef22ddc97c279b53d9cb2c9e7600d8))
* **web:** confirm before removing a pānui attachment ([db17bc8](https://github.com/compassion-soup-kitchen/volunteer-app/commit/db17bc83a93a5f34264ca12d0ed2ecdf6e794229))
* **web:** don't claim someone joined a group that was archived ([965b567](https://github.com/compassion-soup-kitchen/volunteer-app/commit/965b5672429a5e68b6198971027b646eebda4eaf))
* **web:** don't evict a group member the dialog never showed ([2c00888](https://github.com/compassion-soup-kitchen/volunteer-app/commit/2c00888ec43a2f0cece5bd87bb4f6d02209ed5f3))
* **web:** don't let an archived account take on new groups ([720105b](https://github.com/compassion-soup-kitchen/volunteer-app/commit/720105b3bb0e6ddf364734588ba97547d2563922))
* **web:** don't lose a group tick made before the last one saves ([154cb60](https://github.com/compassion-soup-kitchen/volunteer-app/commit/154cb608e4761a455186ecff4d556ecc2d2d4e77))
* **web:** don't silently swallow extra files dropped on a single-file zone ([eb1d9e6](https://github.com/compassion-soup-kitchen/volunteer-app/commit/eb1d9e67669865423f8396679b538450e34f643b))
* **web:** hold one eligibility bar for group membership ([52a1c79](https://github.com/compassion-soup-kitchen/volunteer-app/commit/52a1c79f0789365373fbf709c93d3bb267fe4307))
* **web:** keep archived-group membership through a directory toggle ([6035364](https://github.com/compassion-soup-kitchen/volunteer-app/commit/60353645028b2f49d9354dbdffbc1022076e54e6))
* **web:** make group names unique regardless of case ([2792fe1](https://github.com/compassion-soup-kitchen/volunteer-app/commit/2792fe17db672ebde683bd545ee77d58b69f9881))
* **web:** render destructive confirm buttons in the destructive colour ([f98dca7](https://github.com/compassion-soup-kitchen/volunteer-app/commit/f98dca726a447227666605a1eabcc752d8f98567))
* **web:** revalidate nested shift pages when a group changes ([e13dafc](https://github.com/compassion-soup-kitchen/volunteer-app/commit/e13dafc8e7fdf3e36c0ccb6512b818152c22a35e))
* **web:** swallow drops on a disabled dropzone instead of ignoring them ([716442f](https://github.com/compassion-soup-kitchen/volunteer-app/commit/716442f5463c0a1119d282e50037c9271d977efd))

## [1.10.0](https://github.com/compassion-soup-kitchen/volunteer-app/compare/v1.9.0...v1.10.0) (2026-07-25)


### Features

* **web:** add self-service account page for staff ([d50d70e](https://github.com/compassion-soup-kitchen/volunteer-app/commit/d50d70e6e78405896002e5ea1e924c49aeb68bb4))
* **web:** add self-service account page for staff ([6c98143](https://github.com/compassion-soup-kitchen/volunteer-app/commit/6c98143380d845c1444bc8219a9d752182105a06))
* **web:** admin user impersonation ([4d8e451](https://github.com/compassion-soup-kitchen/volunteer-app/commit/4d8e45160e4040f22674d53e63c9c07150413ce3))
* **web:** admin user impersonation ([98a4a14](https://github.com/compassion-soup-kitchen/volunteer-app/commit/98a4a14c3d9f3a45c2efd6cb63ea7f67b01431ff))
* **web:** confirm before impersonating + document write attribution ([cc1d946](https://github.com/compassion-soup-kitchen/volunteer-app/commit/cc1d946227b76aa95b2cddc8ed7e8bba977a359f))
* **web:** fix shift dates, add first refusal and shift editing ([d2a1a9a](https://github.com/compassion-soup-kitchen/volunteer-app/commit/d2a1a9a7d1faf3a5d189284e2e76f9a1103228f0))
* **web:** redesign logged-in pages to the editorial design system ([16e5b64](https://github.com/compassion-soup-kitchen/volunteer-app/commit/16e5b64251075a1b55c16d3ed6a648a6bc185255))
* **web:** redesign logged-in pages to the editorial design system ([a1d920b](https://github.com/compassion-soup-kitchen/volunteer-app/commit/a1d920b3fdbf5fe7c7641dd0879c19e8403e80b7))


### Bug Fixes

* **web:** address impersonation review feedback ([b78d72d](https://github.com/compassion-soup-kitchen/volunteer-app/commit/b78d72d11b2cc3f8117938a0419b897014b16716))
* **web:** anchor the shift form's today to the kitchen's calendar ([44beca3](https://github.com/compassion-soup-kitchen/volunteer-app/commit/44beca3c0dcce9ae1e4d14e987c490bd7c1c5d15))
* **web:** apply the bcrypt password bounds to every path that sets one ([467eeb9](https://github.com/compassion-soup-kitchen/volunteer-app/commit/467eeb90ac66b01e7279a501d9eaf374f51da146))
* **web:** confirm impersonation swap before redirecting ([655ff07](https://github.com/compassion-soup-kitchen/volunteer-app/commit/655ff07b3bd48b6ce755f1805ba43e757869d395))
* **web:** keep demo credentials out of the client bundle ([6662bea](https://github.com/compassion-soup-kitchen/volunteer-app/commit/6662bea0f605795a37b7ac61c5e4f5c40bf89c9b))
* **web:** keep editable shifts editable once first refusal closes ([14a923d](https://github.com/compassion-soup-kitchen/volunteer-app/commit/14a923d47a9e65ca5a9cc7b978edaacd0e394f67))
* **web:** key account form effects on state identity, not message text ([e51e087](https://github.com/compassion-soup-kitchen/volunteer-app/commit/e51e087159cb251f34a95afb1cc08120419e44a1))
* **web:** measure the bcrypt password limit in bytes, bound current password ([858109c](https://github.com/compassion-soup-kitchen/volunteer-app/commit/858109c2ad89b882980e91c1d8afd35d25d717f8))

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

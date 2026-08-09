# Bolt

Bolt is a fast, customizable browser built by Bolt Builder, based on [Floorp](https://github.com/Floorp-Projects/Floorp), which is based on Mozilla Firefox.

## Layout flexibility

Bolt supports both worlds out of the box:

- Horizontal (normal) tabs, multi-row tabs, or vertical tabs
- Proton interface by default, with Lepton and Photon available in settings
- Workspaces, split view, web apps (PWA), panel sidebar, mouse gestures

## Upstream

This repository is a fork of `Floorp-Projects/Floorp`. Upstream changes are pulled with a regular git merge:

```sh
git remote add upstream https://github.com/Floorp-Projects/Floorp.git
git fetch upstream main
git merge upstream/main
```

## Building

The build system is inherited from Floorp (Deno + pnpm on top of a prebuilt Firefox runtime). See the upstream [Floorp documentation](https://github.com/Floorp-Projects/Floorp) for build instructions until Bolt-specific CI is wired up.

## License

Mozilla Public License 2.0 (MPL-2.0), same as Floorp and Firefox.

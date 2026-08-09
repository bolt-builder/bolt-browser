# Bolt (Floorp-based)

Bolt is a fast, customizable browser built by Bolt Builder. This branch (`floorp-dev`) hosts the Floorp-based Bolt: the classic, flexible layout experience powered by [Floorp](https://github.com/Floorp-Projects/Floorp), which is based on Mozilla Firefox.

The Zen-based Bolt lives on the `dev` branch of this repository. Both browsers share the Bolt brand.

## Layout flexibility

Bolt on Floorp supports both worlds out of the box:

- Horizontal (normal) tabs, multi-row tabs, or vertical tabs
- Proton interface by default, with Lepton and Photon available in settings
- Workspaces, split view, web apps (PWA), panel sidebar, mouse gestures

## Upstream

This branch tracks `Floorp-Projects/Floorp` (`main`). Upstream changes are pulled with a regular git merge thanks to shared history.

```sh
git remote add floorp-upstream https://github.com/Floorp-Projects/Floorp.git
git fetch floorp-upstream main
git merge floorp-upstream/main
```

## Building

The build system is inherited from Floorp (Deno + pnpm on top of a prebuilt Firefox runtime). See the upstream [Floorp documentation](https://github.com/Floorp-Projects/Floorp) for build instructions until Bolt-specific CI is wired up on this branch.

## License

Mozilla Public License 2.0 (MPL-2.0), same as Floorp and Firefox.

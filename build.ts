import { screepsPlugin } from "bun-plugin-screeps";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	target: "node",
	plugins: [screepsPlugin()],
	minify: true,
});

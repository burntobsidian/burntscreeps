import { screepsPlugin } from "bun-plugin-screeps";
import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";

// Determine build mode from command line arguments
const args = process.argv.slice(2);
const isDevelopment = args.includes("--mode=development");
const isProduction = args.includes("--mode=production") || !isDevelopment;

console.log(`🚀 Building Screeps code in ${isDevelopment ? 'development' : 'production'} mode...`);

// First, build with Bun to handle TypeScript and bundling
const result = await Bun.build({
	entrypoints: ["./src/main.ts"],
	outdir: "./dist",
	target: "node",
	format: "cjs",
	
	// Screeps-specific configuration  
	plugins: [screepsPlugin()],
	
	// Dynamic optimization based on mode
	minify: false, // We'll handle minification after Babel
	splitting: false,
	sourcemap: isDevelopment ? "external" : "none",
	
	// Environment-specific defines
	define: {
		"process.env.NODE_ENV": isDevelopment ? '"development"' : '"production"',
		"DEBUG": isDevelopment ? "true" : "false",
	},
	
	// Ensure proper naming for Screeps
	naming: {
		entry: "main.js",
	},
	
	// Performance optimizations
	treeshaking: isProduction,
	bundle: true,
});

if (!result.success) {
	console.error("❌ Build failed:");
	for (const message of result.logs) {
		console.error(message);
	}
	process.exit(1);
}

console.log("✅ Bun build successful!");
console.log("🔄 Running Babel transpilation for Screeps compatibility...");

// Read the built file and transpile with Babel
try {
	const babel = await import("@babel/core");
	const inputCode = readFileSync("./dist/main.js", "utf8");
	
	const transpileResult = await babel.transformAsync(inputCode, {
		presets: [
			["@babel/preset-env", {
				targets: {
					ie: "11" // Maximum compatibility for Screeps
				},
				modules: "cjs",
				forceAllTransforms: true
			}]
		],
		plugins: [
			"@babel/plugin-transform-parameters"
		],
		minified: isProduction,
		compact: isProduction
	});
	
	if (transpileResult?.code) {
		writeFileSync("./dist/main.js", transpileResult.code);
		console.log("✅ Babel transpilation successful!");
		
		const file = Bun.file("./dist/main.js");
		const size = file.size;
		console.log(`📦 Final output: ./dist/main.js (${(size / 1024).toFixed(1)}KB)`);
		
		if (isDevelopment) {
			console.log("🔧 Development build with source maps");
		} else {
			console.log("⚡ Production build optimized and minified");
		}
		
		console.log(`\n🎯 Ready to deploy to Screeps!`);
		console.log(`   Modern TypeScript -> ES5 compatible JavaScript`);
	} else {
		throw new Error("Babel transpilation failed");
	}
} catch (error) {
	console.error("❌ Babel transpilation failed:", error);
	process.exit(1);
}

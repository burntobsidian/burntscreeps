import { screepsPlugin } from "bun-plugin-screeps";

// Determine build mode from command line arguments
const args = process.argv.slice(2);
const isDevelopment = args.includes("--mode=development");
const isProduction = args.includes("--mode=production") || !isDevelopment;

console.log(`🚀 Building Screeps code in ${isDevelopment ? 'development' : 'production'} mode...`);

const result = await Bun.build({
	entrypoints: ["./src/main.ts"],
	outdir: "./dist",
	target: "node",
	format: "cjs",
	
	// Screeps-specific configuration
	plugins: [screepsPlugin()],
	
	// Dynamic optimization based on mode
	minify: isProduction,
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
} else {
	console.log("✅ Build successful!");
	console.log(`📦 Generated: ${result.outputs.length} files`);
	for (const output of result.outputs) {
		const file = Bun.file(output.path);
		const size = file.size;
		console.log(`   - ${output.path} (${(size / 1024).toFixed(1)}KB)`);
	}
	
	if (isDevelopment) {
		console.log("🔧 Development build includes source maps for debugging");
	} else {
		console.log("⚡ Production build optimized for performance");
	}
	
	console.log(`\n🎯 Ready to deploy to Screeps!`);
	console.log(`   Copy the contents of: ./dist/main.js`);
}

/**
 * Bun dev server for the playground.
 *
 * Serves the playground HTML and transpiles TypeScript on-the-fly.
 * Includes live-reload for browser refresh on source file changes.
 * Run: bun playground/serve.ts
 */

import getPort from "get-port"
import { watch } from "node:fs"

const port = await getPort({ port: 4242 })
const root = `${import.meta.dir}/..`
const LIVE_RELOAD_PATH = "/__playground_live_reload"
const WATCH_DIRS = ["src", "playground"]
let reloadVersion = Date.now().toString()
const liveClients = new Set<ReadableStreamDefaultController<Uint8Array>>()
let lastReloadBroadcastAt = 0

console.log(`Playground → http://localhost:${port}`)
setupLiveReloadWatchers()

Bun.serve({
	port,
	idleTimeout: 255,
	async fetch(req) {
		const url = new URL(req.url)
		let pathname = url.pathname

		if (pathname === "/" || pathname === "/index.html") {
			pathname = "/playground/index.html"
		} else if (pathname.startsWith("/playground/") || pathname.startsWith("/src/") || pathname.startsWith("/node_modules/")) {
			// serve as-is from project root
		} else {
			// Relative imports from playground/index.html
			pathname = `/playground${pathname}`
		}

		let filePath = `${root}${pathname}`

		// .js → .ts fallback (TS source imports use .js extensions, skip node_modules)
		if (filePath.endsWith(".js") && !filePath.includes("/node_modules/")) {
			const tsPath = filePath.replace(/\.js$/, ".ts")
			const tsFile = Bun.file(tsPath)
			if (await tsFile.exists()) {
				filePath = tsPath
			}
		}

		if (url.pathname === LIVE_RELOAD_PATH) {
			return createLiveReloadResponse()
		}

		const file = Bun.file(filePath)
		if (!(await file.exists())) {
			return new Response(`Not found: ${pathname}`, { status: 404 })
		}

		if (filePath.endsWith("/playground/index.html")) {
			const html = await file.text()
			return new Response(injectLiveReloadScript(html), {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			})
		}

		// Transpile .ts files to JS on the fly
		if (filePath.endsWith(".ts")) {
			const source = await file.text()
			const transpiler = new Bun.Transpiler({ loader: "ts" })
			const code = transpiler.transformSync(source)
			return new Response(code, {
				headers: { "Content-Type": "application/javascript; charset=utf-8" },
			})
		}

		return new Response(file)
	},
})

function setupLiveReloadWatchers(): void {
	for (const dir of WATCH_DIRS) {
		const absDir = `${root}/${dir}`
		try {
			const watcher = watch(absDir, { recursive: true }, (_eventType, filename) => {
				if (!filename) return
				if (shouldIgnoreFile(filename)) return
				broadcastReload(filename)
			})
			watcher.on("error", (error) => {
				console.warn(`[live-reload] watcher error (${dir}):`, error)
			})
		} catch (error) {
			console.warn(`[live-reload] cannot watch ${absDir}:`, error)
		}
	}
}

function shouldIgnoreFile(filename: string): boolean {
	if (filename.includes("dist/")) return true
	if (filename.endsWith(".map")) return true
	if (filename.endsWith(".tmp")) return true
	return false
}

function broadcastReload(filename: string): void {
	const now = Date.now()
	if (now - lastReloadBroadcastAt < 120) return
	lastReloadBroadcastAt = now

	reloadVersion = now.toString()
	const payload = encodeSseEvent(reloadVersion)
	for (const client of liveClients) {
		try {
			client.enqueue(payload)
		} catch {
			liveClients.delete(client)
		}
	}
	console.log(`[live-reload] change detected → ${filename}`)
}

function createLiveReloadResponse(): Response {
	let clientController: ReadableStreamDefaultController<Uint8Array> | null = null

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			clientController = controller
			liveClients.add(controller)
			controller.enqueue(encodeSseEvent(reloadVersion))
		},
		cancel() {
			if (!clientController) return
			liveClients.delete(clientController)
			clientController = null
		},
	})

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	})
}

function encodeSseEvent(data: string): Uint8Array {
	return new TextEncoder().encode(`data: ${data}\n\n`)
}

function injectLiveReloadScript(html: string): string {
	const script = `<script>
(() => {
	let currentVersion = "";
	let source = null;
	function connect() {
		source = new EventSource("${LIVE_RELOAD_PATH}");
		source.onmessage = (event) => {
			const nextVersion = String(event.data || "");
			if (!nextVersion) return;
			if (!currentVersion) {
				currentVersion = nextVersion;
				return;
			}
			if (nextVersion !== currentVersion) {
				location.reload();
			}
		};
		source.onerror = () => {
			if (source) source.close();
			setTimeout(connect, 500);
		};
	}
	connect();
})();
</script>`

	if (html.includes("</body>")) return html.replace("</body>", `${script}</body>`)
	return `${html}${script}`
}

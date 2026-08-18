from pathlib import Path

root = Path('.')
performance_path = root / 'scripts/smoke-performance-contract.mjs'
performance = performance_path.read_text(encoding='utf-8')

old = "assertNotIncludes('App.tsx', \"  '/category',\\n  '/quiz',\");"
new = '''const dataBootstrapBlockingPrefixesBlock = read('App.tsx').match(\n  /const DATA_BOOTSTRAP_BLOCKING_PREFIXES = \\[([\\s\\S]*?)\\];/,\n)?.[1] ?? '';\nif (dataBootstrapBlockingPrefixesBlock.includes("'/category'")) {\n  throw new Error('App.tsx must not block initial data bootstrap for /category routes');\n}'''

if old not in performance:
    if 'dataBootstrapBlockingPrefixesBlock' in performance:
        print('Bootstrap performance contract already scoped correctly.')
        raise SystemExit(0)
    raise SystemExit('Expected broad DATA_BOOTSTRAP_BLOCKING_PREFIXES assertion was not found.')

performance_path.write_text(performance.replace(old, new, 1), encoding='utf-8')
print('Scoped DATA_BOOTSTRAP_BLOCKING_PREFIXES performance contract to the intended array.')

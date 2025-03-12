build:
  cd lib && wasm-pack build
  cd plugin && pnpm install
  cd plugin && pnpm run build

clean:
  cd plugin && rm -rf node_modules dist
  # cd lib && cargo clean

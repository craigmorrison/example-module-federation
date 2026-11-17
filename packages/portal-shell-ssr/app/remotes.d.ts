// Federated modules resolved by @module-federation/vite (see vite.config.ts).
declare module "table/Table" {
  const Table: import("react").ComponentType;
  export default Table;
}

declare module "counter/Counter" {
  const Counter: import("react").ComponentType;
  export default Counter;
}

declare module "people/People" {
  const People: import("react").ComponentType;
  export default People;
}

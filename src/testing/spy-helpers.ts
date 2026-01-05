import { vi } from 'vitest';

export type Spy<T extends (...args: any[]) => any = (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>;

export type SpyObject<T extends object> = T & {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K] extends (
    ...args: any[]
  ) => any
    ? Spy<T[K]>
    : never;
};

export function createSpy<T extends (...args: any[]) => any = (...args: any[]) => any>(name?: string) {
  const spy = vi.fn<T>();
  if (name) {
    spy.mockName(name);
  }
  return spy;
}

export function createSpyObj<T extends object>(
  nameOrMethodNames: string | ReadonlyArray<keyof T | string>,
  methodNamesMaybe?: ReadonlyArray<keyof T | string>
): SpyObject<T> {
  const methodNames = Array.isArray(nameOrMethodNames) ? nameOrMethodNames : methodNamesMaybe || [];
  const obj: Record<string, Spy> = {};
  methodNames.forEach((method) => {
    obj[method as string] = vi.fn();
  });
  return obj as unknown as SpyObject<T>;
}

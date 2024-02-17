import { DecoratorContext, ModelProperty, Program } from "@typespec/compiler";
import { createStateSymbol } from "./lib.js";

export const namespace = "Django";

const fieldKey = createStateSymbol("field");
/**
 * Set a specific operation ID.
 * @param context Decorator Context
 * @param entity Decorator target
 * @param key Django Field key
 * @param value Django Field value
 */
export function $field(context: DecoratorContext, entity: ModelProperty, key: string, value: any) {
  const values = context.program.stateMap(fieldKey).get(entity) ?? [];
  values.push({ key, value });
  context.program.stateMap(fieldKey).set(entity, values);
}

/**
 * @returns Dictionary of key-value pairs set via the @field decorator
 */
export function getFields(program: Program, entity: ModelProperty): { key: string; value: any }[] {
  return program.stateMap(fieldKey).get(entity);
}

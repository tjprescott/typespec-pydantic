import "../dist/src/index.js";

using TypeSpec.Reflection;

namespace Django;

/**
 * Manually add keyword arguments to a Django Field.
 * @param key: The name of the keyword argument in the Django Field.
 * @param value: The value of the keyword argument in the Django Field.
 */
extern dec field(target: ModelProperty, key: valueof string, value: unknown);

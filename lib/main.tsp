import "../dist/src/index.js";

using TypeSpec.Reflection;

namespace Pydantic;

/**
 * Manually add keyword arguments to a Pydantic Field.
 * @param key: The name of the keyword argument in the Pydantic Field.
 * @param value: The value of the keyword argument in the Pydantic Field.
 */
extern dec field(target: ModelProperty, key: valueof string, value: unknown);

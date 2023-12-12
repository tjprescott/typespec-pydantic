import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { registerMonacoDefaultWorkersForVite } from "@typespec/playground";
import PlaygroundManifest from "@typespec/playground/manifest";
import { Footer, FooterItem, FooterVersionItem, renderReactPlayground, } from "@typespec/playground/react";
import { SwaggerUIViewer } from "@typespec/playground/react/viewers";
import samples from "../samples/dist/samples.js";
import { MANIFEST } from "@typespec/compiler";
import "@typespec/playground/style.css";
import "./style.css";
registerMonacoDefaultWorkersForVite();
const commit = typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : undefined;
const pr = typeof __PR__ !== "undefined" ? __PR__ : undefined;
const PlaygroundFooter = () => {
    const prItem = pr ? (_jsxs(FooterItem, { link: `https://github.com/microsoft/typespec/pull/${pr}`, children: [_jsx("span", { children: "PR " }), _jsx("span", { children: pr })] })) : (_jsx(_Fragment, {}));
    return (_jsxs(Footer, { className: pr && "pr-footer", children: [prItem, _jsx(FooterVersionItem, {}), _jsxs(FooterItem, { link: `https://github.com/microsoft/typespec/commit/${commit}`, children: [_jsx("span", { children: "Commit " }), _jsx("span", { children: MANIFEST.commit.slice(0, 6) })] })] }));
};
await renderReactPlayground({
    ...PlaygroundManifest,
    samples,
    emitterViewers: {
        "@typespec/openapi3": [SwaggerUIViewer],
    },
    importConfig: {
        useShim: true,
    },
    footer: _jsx(PlaygroundFooter, {}),
});
//# sourceMappingURL=main.js.map
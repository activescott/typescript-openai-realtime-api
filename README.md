# tsorta: TypeScript OpenAI Realtime API

This repo is for an article I've written about how to use the OpenAI Realtime API with TypeScript + React and WebRTC.
It is a working example that you can experience the Realtime API with yourself. The WebRTC client also does some heavy lifting around managing the conversation state and audio streams.

This repo also has an example that demonstrates the [OpenAI Official SDK support for WebSocket API](https://github.com/openai/openai-node/commit/a796d21f06307419f352da8b9943f6745ff4084f) that was released in beta on Jan 17, 2025. As of the time that I'm writing this, the official SDK doesn't provide support for managing the conversation state, audio streams, nor WebRTC which is all demonstrated in the example. See [apps/browser-example/src/pages/WebRTCExample.tsx](apps/browser-example/src/pages/WebRTCExample.tsx) for the complete example code.

This project also has a reusable package that you can use in your own projects in [packages/browser](packages/browser). I plan to publish this here soon for others. If you're interested in the package let me know and I'll get it pushed to npm!

More at https://scott.willeke.com/ai-typescript-client-for-openai-realtime-api

## References

- https://platform.openai.com/docs/guides/realtime-webrtc - guide
- https://github.com/openai/openai-openapi - reference
- https://reactrouter.com/home
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://github.com/openai/openai-node
- https://webrtc.github.io/samples/
- https://fly.io/docs/languages-and-frameworks/dockerfile/

import adapter from "@sveltejs/adapter-static";

const config = {
  kit: {
    adapter: adapter({ pages: "../docs", assets: "../docs", fallback: undefined }),
    paths: { base: "/beyond-evals-lab" },
  },
};

export default config;

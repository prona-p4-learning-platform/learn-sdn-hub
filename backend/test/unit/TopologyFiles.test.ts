import {
  collectReferencedBindSources,
  resolveFileUrl,
} from "../../src/providers/TopologyFiles";

describe("collectReferencedBindSources", () => {
  it("collects relative bind sources from all nodes", () => {
    const topology = {
      topology: {
        nodes: {
          server1: {
            kind: "linux",
            image: "foo",
            binds: ["server1/dnsmasq.conf:/etc/dnsmasq.conf"],
          },
          server2: {
            kind: "linux",
            image: "bar",
            binds: ["configs/hosts:/etc/hosts"],
          },
          server3: {
            kind: "linux",
            image: "baz",
          },
        },
      },
    };
    expect(collectReferencedBindSources(topology)).toEqual([
      "server1/dnsmasq.conf",
      "configs/hosts",
    ]);
  });

  it("skips absolute paths, volumes and malformed binds", () => {
    const topology = {
      topology: {
        nodes: {
          n1: {
            binds: [
              "/etc/localtime:/etc/localtime",
              "myvolume:/data",
              "just-a-string",
            ],
          },
        },
      },
    };
    expect(collectReferencedBindSources(topology)).toEqual([]);
  });

  it("normalizes ./ prefixes", () => {
    const topology = {
      topology: {
        nodes: {
          n1: {
            binds: ["./server1/dnsmasq.conf:/etc/dnsmasq.conf"],
          },
        },
      },
    };
    expect(collectReferencedBindSources(topology)).toEqual([
      "server1/dnsmasq.conf",
    ]);
  });
});

describe("resolveFileUrl", () => {
  it("resolves file URLs relative to the topology directory, ignoring query strings", () => {
    expect(
      resolveFileUrl("https://host/labs/lab.clab.yml?raw=1", "server1/dnsmasq.conf"),
    ).toBe("https://host/labs/server1/dnsmasq.conf");
    expect(resolveFileUrl("https://host/labs/", "a.conf")).toBe(
      "https://host/labs/a.conf",
    );
  });
});

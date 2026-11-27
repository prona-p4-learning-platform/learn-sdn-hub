# containerlab provider

(using [ContainerlabProvider.ts](/backend/src/providers/ContainerlabProvider.ts))

The backend also supports [containerlab](https://containerlab.dev/) labs as assignments. The labs are deployed on a remote host by [clab-api-server](https://github.com/srl-labs/clab-api-server), which the backend talks to via its REST and WebSocket API. A **minimum clab-api-server version of v0.7.0 providing the workspace file endpoints (`POST /api/v1/labs/workspace/directory`, `PUT /api/v1/labs/workspace/file`), the `POST /api/v1/labs/{labName}/deploy?path=` endpoint and the terminal-sessions API is required** — older releases without these endpoints cannot be used.

```sh
export CLAB_USERNAME="clab-username"
export CLAB_PASSWORD="clab-password"
export CLAB_APIURL="https://<clab-host>:8090"
export CLAB_MAX_INSTANCE_LIFETIME_MINUTES=120

# optional
export CLAB_TOKEN_DURATION_IN_MINUTES=60
export CLAB_LAB_PREFIX=""
export CLAB_API_TLS_INSECURE=false
```

`CLAB_USERNAME` and `CLAB_PASSWORD` are the credentials used to authenticate against clab-api-server, `CLAB_APIURL` is its base URL (normalized to exactly one trailing slash). `CLAB_MAX_INSTANCE_LIFETIME_MINUTES` (required) limits how long a deployed lab may live before it is pruned. `CLAB_TOKEN_DURATION_IN_MINUTES` (optional, default `60`) is the lifetime of the Bearer tokens the backend requests. `CLAB_LAB_PREFIX` (optional, default `""`) is prepended to every lab name. **Warning:** if the clab-api-server is shared with other users, set `CLAB_LAB_PREFIX` to a unique prefix — with the default empty prefix the periodic prune treats *all* labs on the clab-api-server as owned by this backend and may delete foreign labs once they exceed the configured lifetime. Set `CLAB_API_TLS_INSECURE=true` (or `1`) if the clab-api-server uses a self-signed certificate; the default `false` enforces strict TLS validation.

Each lab is named `${CLAB_LAB_PREFIX}${environmentId}-${groupNumber}-${username}`, so every group and user gets its own isolated lab.

An example assignment deploying a topology from a URL with container-based terminals is provided in [sample-assignment-topologyurl.ts](/examples/containerlab-provider/sample-assignment-topologyurl.ts); a matching sample topology (including a management host node) is in [sample-topology-with-mgmt-host.clab.yml](/examples/containerlab-provider/sample-topology-with-mgmt-host.clab.yml).

## Terminals

Two terminal types are supported for containerlab assignments:

* `DockerShell` terminals (`{type: "DockerShell", name, containerName}`) connect directly to a container of the lab through clab-api-server's terminal sessions (server-side PTY-backed `docker exec`), so no `sshd` is needed inside the lab images.
* Regular `Shell` terminals connect over SSH to the jumphost (management host) container of the lab.

## Deploying from a URL with referenced files

An assignment's `topologyUrl` points to a containerlab topology YAML file served by a web server. The provider fetches the topology, renames the lab to the per-group lab name and deploys it in the clab-api-server workspace.

Topology files may reference additional files with relative bind mounts, e.g.:

```yaml
nodes:
  server1:
    kind: linux
    binds:
      - server1/dnsmasq.conf:/etc/dnsmasq.conf
```

Such referenced files are fetched — resolved relative to the directory containing the topology URL, e.g. `https://<webhost>/labs/sample.clab.yml` → `https://<webhost>/labs/server1/dnsmasq.conf` — and staged together with the rewritten topology into the clab-api-server workspace. The lab is then deployed by path from that workspace directory, so the remote deployment host does not need access to the original web server. If a referenced file cannot be fetched, the deploy fails and the error names the missing file's URL; the partially created lab is cleaned up.

import { Box, Button, Menu, MenuItem, Typography } from "@mui/material"
import { GroupProps } from "./NormalAssignment"
import AssignmentItem from "./AssignmentItem"
import { useCallback, useState } from "react"
import { closeSnackbar, enqueueSnackbar } from "notistack"
import { APIRequest, getHttpError } from "../../api/Request"
import { z } from "zod"
import { FetchError } from "ofetch"

const defaultValidator = z.object({})

const VClusterAssignments = ({ assignments, contextData, actions }: GroupProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const deploy = useCallback(async () => {
    const creatingSnack = enqueueSnackbar("Setting up Kubernetes configuration...", {
      variant: "info",
      persist: true,
    });

    try {
      await APIRequest("/k8s-vcluster/deploy", defaultValidator, {
        method: "POST",
        timeout: 30000, // 30 seconds timeout
      });

      enqueueSnackbar("Kubernetes configuration setup successful!", { variant: "success" });
    } catch (error) {
      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);
        const message = httpError.success
          ? httpError.data.message
          : httpError.error.message;

        enqueueSnackbar("Kubernetes configuration setup failed! (" + message + ")", {
          variant: "error",
        });
      } else {
        enqueueSnackbar("Kubernetes cluster setup error while connecting to backend!", {
          variant: "error",
        });
      }
    }

    closeSnackbar(creatingSnack);
  }, [enqueueSnackbar, closeSnackbar])

  const undeploy = useCallback(async () => {
    const creatingSnack = enqueueSnackbar("Undeploying Kubernetes configuration...", {
      variant: "info",
      persist: true,
    });

    try {
      await APIRequest("/k8s-vcluster/undeploy", defaultValidator, {
        method: "DELETE",
        timeout: 30000, // 30 seconds timeout
      });

      enqueueSnackbar("Kubernetes configuration undeploy successful!", { variant: "success" });
    } catch (error) {
      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);
        const message = httpError.success
          ? httpError.data.message
          : httpError.error.message;

        enqueueSnackbar("Kubernetes configuration undeploy failed! (" + message + ")", {
          variant: "error",
        });
      } else {
        enqueueSnackbar("Kubernetes cluster undeploy error while connecting to backend!", {
          variant: "error",
        });
      }
    }

    closeSnackbar(creatingSnack);
  }, [enqueueSnackbar, closeSnackbar])

  const downloadKubeconfig = useCallback(
    async () => {
      const creatingSnack = enqueueSnackbar("Downloading Kubernetes configuration...", {
        variant: "info",
        persist: true,
      });

      try {
        const response = await APIRequest("/k8s-vcluster/kube-config", defaultValidator, {
          method: "GET",
          timeout: 2000, // 30 seconds timeout
        });

        // Download kubeconfig file
        const yamlContent = response.rawBody;
        const blob = new Blob([yamlContent], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "kubeconfig.yaml";
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Store kubeconfig in local storage
        localStorage.setItem("kubeconfig", yamlContent);

        enqueueSnackbar("Kubernetes configuration download successful!", { variant: "success" });
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Kubernetes configuration download failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Kubernetes configuration download error while connecting to backend!", {
            variant: "error",
          });
        }
      }

      closeSnackbar(creatingSnack);
    },
    [enqueueSnackbar, closeSnackbar]
  )


  if (assignments.length === 0) {
    return null
  }

  return (
    <div className="group-normal">
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        vCluster Assignments
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, p: 1, alignItems: 'flex-start' }}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          The following exercises require a Kubernetes deploayed with vCluster environment. To deploy the environment, the 'Setup' button must be used once. Don't forget to press the 'Undeploy' button after completing the exercises.
        </Typography>
        <Box>
          <Button variant="contained" color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            vCluster
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => {
              deploy()
              setAnchorEl(null)
            }}>
              Setup
            </MenuItem>
            <MenuItem onClick={() => {
              undeploy()
              setAnchorEl(null)
            }}>
              Undeploy
            </MenuItem>
            <MenuItem onClick={() => {
              downloadKubeconfig()
              setAnchorEl(null)
            }}>
              Download kubeconfig
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      {assignments.map(item => (
        <AssignmentItem
          key={item.name}
          name={item.name}
          data={contextData}
          onDeploy={actions.deploy}
          onUndeploy={actions.undeploy}
          onResubmit={actions.resubmit}
        />
      ))}
    </div>
  )
}

export default VClusterAssignments
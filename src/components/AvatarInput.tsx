import { Avatar, Button, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useRef, useState } from "react";
import { useInput, useNotify, useRecordContext, useRefresh, useTranslate } from "react-admin";

import storage from "../storage";
import { requireStoredBaseUrl } from "../synapse/synapse";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const mxcUrlToHttpFull = (mxcUrl: string): string => {
  const baseUrl = requireStoredBaseUrl();
  const match = /^mxc:\/\/([^/]+)\/(\w+)/.exec(mxcUrl);
  if (!match) return "";
  const [, serverName, mediaId] = match;
  return `${baseUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`;
};

const AvatarInput = ({ source, ...rest }: { source: string; [key: string]: any }) => {
  const record = useRecordContext(rest);
  const translate = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { field } = useInput({ source });

  const currentAvatarUrl = record?.avatar_url;
  const userId = record?.id;
  const displaySrc = previewUrl || (currentAvatarUrl ? mxcUrlToHttpFull(currentAvatarUrl) : undefined);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !userId) return;

      if (!file.type.startsWith("image/")) {
        setUploadError(translate("resources.users.avatar_not_image", { _: "Please select an image file" }));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError(translate("resources.users.avatar_too_large", { _: "Image must be under 10MB" }));
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        const baseUrl = requireStoredBaseUrl();
        const accessToken = storage.getItem("access_token");

        // Step 1: Upload media
        const uploadResp = await fetch(
          `${baseUrl}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": file.type,
              Authorization: `Bearer ${accessToken}`,
            },
            body: file,
          },
        );

        if (!uploadResp.ok) {
          throw new Error(`Upload failed: ${uploadResp.status}`);
        }

        const uploadData = await uploadResp.json();
        const mxcUri: string = uploadData.content_uri;

        // Step 2: Set as avatar
        const avatarResp = await fetch(
          `${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(userId)}/avatar_url`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ avatar_url: mxcUri }),
          },
        );

        if (!avatarResp.ok) {
          throw new Error(`Set avatar failed: ${avatarResp.status}`);
        }

        // Update form field value
        field.onChange(mxcUri);
        // Show preview immediately
        setPreviewUrl(mxcUrlToHttpFull(mxcUri));

        notify("resources.users.avatar_updated", { type: "success", messageArgs: { _: "Avatar updated" } });
        // Refresh the view to sync the form record with server data
        refresh();
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
        notify("resources.users.avatar_error", { type: "error", messageArgs: { _: err.message || "Upload failed" } });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [userId, field, translate, notify, refresh],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (!userId) return;

    setUploading(true);
    setUploadError(null);

    try {
      const baseUrl = requireStoredBaseUrl();
      const accessToken = storage.getItem("access_token");

      const avatarResp = await fetch(
        `${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(userId)}/avatar_url`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ avatar_url: "" }),
        },
      );

      if (!avatarResp.ok) {
        throw new Error(`Remove avatar failed: ${avatarResp.status}`);
      }

      field.onChange("");
      setPreviewUrl(null);

      notify("resources.users.avatar_removed", { type: "success", messageArgs: { _: "Avatar removed" } });
      refresh();
    } catch (err: any) {
      setUploadError(err.message || "Remove avatar failed");
      notify("resources.users.avatar_error", { type: "error", messageArgs: { _: err.message || "Remove avatar failed" } });
    } finally {
      setUploading(false);
    }
  }, [userId, field, notify, refresh]);

  return (
    <div style={{ textAlign: "center", marginBottom: "16px" }}>
      <Avatar
        src={displaySrc}
        sx={{ height: "120px", width: "120px", margin: "0 auto 12px", cursor: "pointer" }}
        onClick={() => fileInputRef.current?.click()}
      />
      <div>
        <Button
          component="label"
          variant="contained"
          size="small"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
          sx={{ mr: 1 }}
        >
          {uploading
            ? translate("resources.users.avatar_uploading", { _: "Uploading..." })
            : translate("resources.users.avatar_upload", { _: "Upload" })}
          <VisuallyHiddenInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </Button>
        {currentAvatarUrl && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={uploading}
            onClick={handleRemoveAvatar}
          >
            {translate("resources.users.avatar_remove", { _: "Remove" })}
          </Button>
        )}
      </div>
      {uploadError && (
        <div style={{ color: "#f44336", fontSize: "0.75rem", marginTop: "8px" }}>{uploadError}</div>
      )}
    </div>
  );
};

export default AvatarInput;

import { Avatar, Button, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useRef, useState } from "react";
import { useDataProvider, useNotify, useRecordContext, useTranslate } from "react-admin";

import { requireStoredBaseUrl } from "../synapse/synapse";
import storage from "../storage";

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

const AvatarInput = ({ source, ...rest }: { source: string; [key: string]: any }) => {
  const record = useRecordContext(rest);
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cache fresh-upload previews per userId (ref survives react-admin re-renders)
  const previewCache = useRef<Record<string, string>>({});
  const [, forceRender] = useState(0);

  const userId = record?.id;

  // dataProvider stores avatar_src as HTTP URL (already converted from mxc://).
  // With enable_authenticated_media=false, media is public — no auth needed.
  const displaySrc =
    record?.avatar_src ||
    (userId ? previewCache.current[userId] : null);

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

        // 1. Upload media (requires auth, but stored as public thanks to
        //    enable_authenticated_media: false in Synapse config)
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

        if (!uploadResp.ok) throw new Error(`Upload failed: ${uploadResp.status}`);
        const { content_uri: mxcUri } = await uploadResp.json();

        // 2. Update user avatar via Synapse Admin API
        await dataProvider.update("users", {
          id: userId,
          data: { avatar_url: mxcUri },
          previousData: record,
        });

        // 3. Show preview immediately (public media, direct URL works)
        const [, serverName, mediaId] = /^mxc:\/\/([^/]+)\/(\w+)/.exec(mxcUri)!;
        const httpUrl = `${baseUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`;
        previewCache.current[userId] = httpUrl;
        forceRender(n => n + 1);

        notify("resources.users.avatar_updated", { type: "success", messageArgs: { _: "Avatar updated" } });
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
        notify("resources.users.avatar_error", { type: "error", messageArgs: { _: err.message || "Upload failed" } });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [userId, dataProvider, record, translate, notify],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (!userId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await dataProvider.update("users", {
        id: userId,
        data: { avatar_url: "" },
        previousData: record,
      });
      delete previewCache.current[userId];
      forceRender(n => n + 1);
      notify("resources.users.avatar_removed", { type: "success", messageArgs: { _: "Avatar removed" } });
    } catch (err: any) {
      setUploadError(err.message || "Remove avatar failed");
      notify("resources.users.avatar_error", { type: "error", messageArgs: { _: err.message || "Remove avatar failed" } });
    } finally {
      setUploading(false);
    }
  }, [userId, dataProvider, record, notify]);

  const hasAvatar = !!(record?.avatar_src || (userId && previewCache.current[userId]));

  return (
    <div style={{ textAlign: "center", marginBottom: "16px" }}>
      <Avatar
        src={displaySrc || undefined}
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
          <VisuallyHiddenInput ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} />
        </Button>
        {hasAvatar && (
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
      {uploadError && <div style={{ color: "#f44336", fontSize: "0.75rem", marginTop: "8px" }}>{uploadError}</div>}
    </div>
  );
};

export default AvatarInput;

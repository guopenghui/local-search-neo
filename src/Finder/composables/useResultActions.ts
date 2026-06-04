import type { FinderResult } from "../core/finderLogic";

interface UseResultActionsOptions {
  confirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }) => Promise<boolean>;
  onTrashed: (fullPath: string) => void;
}

export interface ResultActions {
  open(item?: FinderResult): void;
  showInFolder(item: FinderResult): void;
  copyFullPath(item: FinderResult): void;
  copyDirectoryPath(item: FinderResult): void;
  trash(item: FinderResult): Promise<void>;
}

export function useResultActions({ confirm, onTrashed }: UseResultActionsOptions): ResultActions {
  function open(item?: FinderResult) {
    if (item?.fullPath) window.ztools.shellOpenPath(item.fullPath);
  }

  function showInFolder(item: FinderResult) {
    if (item.fullPath) window.ztools.shellShowItemInFolder(item.fullPath);
  }

  function copyFullPath(item: FinderResult) {
    if (item.fullPath) window.ztools.copyText(item.fullPath);
  }

  function copyDirectoryPath(item: FinderResult) {
    if (item.path) window.ztools.copyText(item.path);
  }

  async function trash(item: FinderResult) {
    if (!item.fullPath) return;

    const confirmed = await confirm({
      title: "删除文件",
      message: `确定要将“${item.name}”移入回收站吗？`,
      confirmText: "删除",
      danger: true,
    });
    if (!confirmed) return;

    await window.ztools.shellTrashItem(item.fullPath);
    onTrashed(item.fullPath);
  }

  return {
    open,
    showInFolder,
    copyFullPath,
    copyDirectoryPath,
    trash,
  };
}

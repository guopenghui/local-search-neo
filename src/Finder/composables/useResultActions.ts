import { useGlocalConfirmDialog } from "../../components/useGlocalConfirmDialog";
import { getDragTargetPaths, type FinderResult } from "../core/finderLogic";

interface UseResultActionsOptions {
  onTrashed: (fullPaths: string[]) => void;
}

export interface ResultActions {
  open(items: FinderResult[]): void;
  showInFolder(items: FinderResult[]): void;
  copyFullPath(items: FinderResult[]): void;
  copyDirectoryPath(items: FinderResult[]): void;
  copyFile(items: FinderResult[]): void;
  trash(items: FinderResult[]): Promise<void>;
  startDrag(item: FinderResult, selectedPaths: string[]): void;
}

const { confirm } = useGlocalConfirmDialog();

export function useResultActions({ onTrashed }: UseResultActionsOptions): ResultActions {
  function open(items: FinderResult[]) {
    for (const item of items) {
      if (item.fullPath) window.ztools.shellOpenPath(item.fullPath);
    }
  }

  function showInFolder(items: FinderResult[]) {
    for (const item of items) {
      if (item.fullPath) window.ztools.shellShowItemInFolder(item.fullPath);
    }
  }

  function copyFullPath(items: FinderResult[]) {
    const paths = items.map((item) => item.fullPath).filter((p): p is string => !!p);
    if (paths.length > 0) window.ztools.copyText(paths.join("\r\n"));
  }

  function copyDirectoryPath(items: FinderResult[]) {
    const directories = Array.from(
      new Set(items.map((item) => item.path).filter((p): p is string => !!p)),
    );
    if (directories.length > 0) window.ztools.copyText(directories.join("\r\n"));
  }

  function copyFile(items: FinderResult[]) {
    const paths = items.map((item) => item.fullPath).filter((p): p is string => !!p);
    if (paths.length > 0) window.ztools.copyFile(paths);
  }

  function startDrag(item: FinderResult, selectedPaths: string[]) {
    if (!item.fullPath) return;
    const target = getDragTargetPaths(item.fullPath, selectedPaths);
    window.ztools.startDrag(target);
  }

  async function trash(items: FinderResult[]) {
    const validItems = items.filter(
      (item): item is FinderResult & { fullPath: string } => !!item.fullPath,
    );
    if (validItems.length === 0) return;

    const isSingle = validItems.length === 1;
    const confirmed = await confirm({
      title: isSingle ? "删除文件" : `删除 ${validItems.length} 个文件`,
      message: isSingle
        ? `确定要将“${validItems[0].name}”移入回收站吗？`
        : `确定要将选中的 ${validItems.length} 个文件移入回收站吗？`,
      confirmText: "删除",
      danger: true,
    });
    if (!confirmed) return;

    const results = await Promise.allSettled(
      validItems.map(async (item) => {
        await window.ztools.shellTrashItem(item.fullPath);
        return item.fullPath;
      }),
    );

    const successPaths = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    if (successPaths.length > 0) {
      onTrashed(successPaths);
    }
  }

  return {
    open,
    showInFolder,
    copyFullPath,
    copyDirectoryPath,
    copyFile,
    trash,
    startDrag,
  };
}

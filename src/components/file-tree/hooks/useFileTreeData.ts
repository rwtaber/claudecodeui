import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../utils/api';
import type { Project } from '../../../types/app';
import type { FileTreeNode } from '../types/types';

type UseFileTreeDataResult = {
  files: FileTreeNode[];
  loading: boolean;
  loadingDirs: Set<string>;
  refreshFiles: () => void;
  loadChildren: (projectName: string, dirPath: string) => Promise<void>;
};

function mergeChildrenAtPath(
  nodes: FileTreeNode[],
  targetPath: string,
  children: FileTreeNode[],
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children && node.type === 'directory') {
      return { ...node, children: mergeChildrenAtPath(node.children, targetPath, children) };
    }
    return node;
  });
}

export function useFileTreeData(selectedProject: Project | null): UseFileTreeDataResult {
  const [files, setFiles] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshFiles = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const loadChildren = useCallback(
    async (projectName: string, dirPath: string) => {
      setLoadingDirs((prev) => {
        const next = new Set(prev);
        next.add(dirPath);
        return next;
      });

      try {
        const response = await api.getFileChildren(projectName, dirPath);
        if (!response.ok) {
          console.error('Failed to load children for', dirPath);
          return;
        }
        const children = (await response.json()) as FileTreeNode[];
        setFiles((prev) => mergeChildrenAtPath(prev, dirPath, children));
      } catch (error) {
        console.error('Error loading children:', error);
      } finally {
        setLoadingDirs((prev) => {
          const next = new Set(prev);
          next.delete(dirPath);
          return next;
        });
      }
    },
    [],
  );

  useEffect(() => {
    const projectName = selectedProject?.name;

    if (!projectName) {
      setFiles([]);
      setLoading(false);
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Track mount state so aborted or late responses do not enqueue stale state updates.
    let isActive = true;

    const fetchFiles = async () => {
      if (isActive) {
        setLoading(true);
      }
      try {
        const response = await api.getFiles(projectName, { signal: abortControllerRef.current!.signal });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('File fetch failed:', response.status, errorText);
          if (isActive) {
            setFiles([]);
          }
          return;
        }

        const data = (await response.json()) as FileTreeNode[];
        if (isActive) {
          setFiles(data);
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return;
        }

        console.error('Error fetching files:', error);
        if (isActive) {
          setFiles([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchFiles();

    return () => {
      isActive = false;
      abortControllerRef.current?.abort();
    };
  }, [selectedProject?.name, refreshKey]);

  return {
    files,
    loading,
    loadingDirs,
    refreshFiles,
    loadChildren,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../utils/api';
import type { Project } from '../../../types/app';
import type { FileTreeNode } from '../types/types';

type UseFileTreeDataResult = {
  files: FileTreeNode[];
  loading: boolean;
  loadingDirs: Set<string>;
  errorDirs: Set<string>;
  refreshFiles: () => void;
  loadChildren: (projectName: string, dirPath: string) => Promise<void>;
  retryLoadChildren: (projectName: string, dirPath: string) => Promise<void>;
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

function collectLoadedDirs(nodes: FileTreeNode[], set: Set<string>) {
  for (const node of nodes) {
    if (node.type === 'directory' && node.children && node.children.length > 0) {
      set.add(node.path);
    }
  }
}

export function useFileTreeData(selectedProject: Project | null): UseFileTreeDataResult {
  const [files, setFiles] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(() => new Set());
  const [errorDirs, setErrorDirs] = useState<Set<string>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedDirsRef = useRef<Set<string>>(new Set());

  const refreshFiles = useCallback(() => {
    loadedDirsRef.current.clear();
    setErrorDirs(new Set());
    setRefreshKey((prev) => prev + 1);
  }, []);

  const loadChildren = useCallback(
    async (projectName: string, dirPath: string) => {
      // Skip if already successfully loaded (cache hit)
      if (loadedDirsRef.current.has(dirPath)) return;

      // Clear any previous error for this path
      setErrorDirs((prev) => {
        if (!prev.has(dirPath)) return prev;
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });

      setLoadingDirs((prev) => {
        const next = new Set(prev);
        next.add(dirPath);
        return next;
      });

      try {
        const response = await api.getFileChildren(projectName, dirPath);
        if (!response.ok) {
          console.error('Failed to load children for', dirPath);
          setErrorDirs((prev) => {
            const next = new Set(prev);
            next.add(dirPath);
            return next;
          });
          return;
        }
        const children = (await response.json()) as FileTreeNode[];
        setFiles((prev) => mergeChildrenAtPath(prev, dirPath, children));
        loadedDirsRef.current.add(dirPath);
      } catch (error) {
        console.error('Error loading children:', error);
        setErrorDirs((prev) => {
          const next = new Set(prev);
          next.add(dirPath);
          return next;
        });
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

  const retryLoadChildren = useCallback(
    async (projectName: string, dirPath: string) => {
      // Clear cache entry so loadChildren doesn't short-circuit
      loadedDirsRef.current.delete(dirPath);
      return loadChildren(projectName, dirPath);
    },
    [loadChildren],
  );

  useEffect(() => {
    const projectName = selectedProject?.name;

    if (!projectName) {
      setFiles([]);
      setLoading(false);
      loadedDirsRef.current.clear();
      setErrorDirs(new Set());
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
          // Mark directories that arrived pre-populated from depth-1 fetch
          loadedDirsRef.current.clear();
          collectLoadedDirs(data, loadedDirsRef.current);
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
    errorDirs,
    refreshFiles,
    loadChildren,
    retryLoadChildren,
  };
}

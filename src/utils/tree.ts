// src/utils/tree.ts

export interface TreeNode {
    name: string;      // Display name (folder name or article title)
    path: string;      // Unique node path identifier
    isFolder: boolean; // Flag indicating if node is a folder
    children?: TreeNode[];
    data?: any;        // Article metadata (present on file nodes)
}

export function buildBlogTree(allPosts: any[]): TreeNode[] {
    const root: TreeNode[] = [];

    allPosts.forEach((post) => {
        // Strip file extensions (.md / .mdx) and split path segments
        const relativePath = post.id || post.slug;
        const pathParts = relativePath.replace(/\.mdx?$/, '').split('/');
        let currentLevel = root;

        pathParts.forEach((part: string, index: number) => {
            const isLast = index === pathParts.length - 1;
            const currentPath = pathParts.slice(0, index + 1).join('/');

            let existingNode = currentLevel.find((node) => node.path === currentPath);

            if (!existingNode) {
                existingNode = {
                    name: isLast ? post.data.title : part,
                    path: currentPath,
                    isFolder: !isLast,
                    children: isLast ? undefined : [],
                    data: isLast ? post : undefined,
                };
                currentLevel.push(existingNode);
            }

            if (!isLast) {
                currentLevel = existingNode.children!;
            }
        });
    });

    return root;
}
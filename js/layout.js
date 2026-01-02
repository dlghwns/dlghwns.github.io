export function sortBubblesMindMap(root, saveState) {
    const children = root.children;
    if (!children || children.length === 0) return;
    const gapX = 80;
    const gapY = 20;
    const getSubtreeHeight = (node) => {
        const minHeight = node.radius * 2 + gapY;
        if (!node.children || node.children.length === 0) return minHeight;
        let total = 0;
        node.children.forEach(child => { total += getSubtreeHeight(child); });
        return Math.max(total, minHeight);
    };
    const arrangeSide = (node, direction) => {
        const children = node.children;
        if (!children || children.length === 0) return;
        const totalH = getSubtreeHeight(node);
        let currentY = node.targetY - totalH / 2;
        children.forEach(child => {
            const h = getSubtreeHeight(child);
            child.targetX = node.targetX + (node.radius + child.radius + gapX) * direction;
            child.targetY = currentY + h / 2;
            arrangeSide(child, direction);
            currentY += h;
        });
    };
    root.targetX = root.x;
    root.targetY = root.y;
    const half = Math.ceil(children.length / 2);
    const rightChildren = children.slice(0, half);
    const leftChildren = children.slice(half);
    let rightTotalH = rightChildren.reduce((sum, c) => sum + getSubtreeHeight(c), 0);
    let currentYRight = root.targetY - rightTotalH / 2;
    rightChildren.forEach(child => {
        const h = getSubtreeHeight(child);
        child.targetX = root.targetX + (root.radius + child.radius + gapX);
        child.targetY = currentYRight + h / 2;
        arrangeSide(child, 1);
        currentYRight += h;
    });
    let leftTotalH = leftChildren.reduce((sum, c) => sum + getSubtreeHeight(c), 0);
    let currentYLeft = root.targetY - leftTotalH / 2;
    leftChildren.forEach(child => {
        const h = getSubtreeHeight(child);
        child.targetX = root.targetX - (root.radius + child.radius + gapX);
        child.targetY = currentYLeft + h / 2;
        arrangeSide(child, -1);
        currentYLeft += h;
    });
    if (saveState) saveState();
}

export function sortBubblesTree(root, saveState) {
    const gapX = 20;
    const gapY = 80;
    const getSubtreeWidth = (node) => {
        const minWidth = node.radius * 2 + gapX;
        if (!node.children || node.children.length === 0) return minWidth;
        let total = 0;
        node.children.forEach(child => { total += getSubtreeWidth(child); });
        return Math.max(total, minWidth);
    };
    const arrange = (node) => {
        const children = node.children;
        if (!children || children.length === 0) return;
        const totalW = getSubtreeWidth(node);
        let currentX = node.targetX - totalW / 2;
        children.forEach(child => {
            const w = getSubtreeWidth(child);
            child.targetX = currentX + w / 2;
            child.targetY = node.targetY + (node.radius + child.radius + gapY);
            arrange(child);
            currentX += w;
        });
    };
    root.targetX = root.x;
    root.targetY = root.y;
    arrange(root);
    if (saveState) saveState();
}

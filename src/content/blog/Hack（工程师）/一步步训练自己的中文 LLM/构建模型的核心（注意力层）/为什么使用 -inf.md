---
title: '为什么使用 -inf'
description: '为什么使用 -inf'
pubDate: 'May 28 2024'
heroImage: '../../../../../assets/i_15.jpg'
---

在深度学习中，尤其是自注意力机制（self-attention）中，使用 \\(-\\text\{torch.inf\}\\)（负无穷大）来填充掩码（mask）位置，而不是 0，有一个重要的原因：确保这些掩码位置在 Softmax 操作之后不会对结果产生影响。
### 背景
自注意力机制通过计算输入序列中每个位置与其他所有位置的注意力权重来工作。这些权重通常是通过 Softmax 函数计算的，它将输入转换为概率分布。Softmax 函数公式为：
\\\[ \\text\{softmax\}(x_i) = \\frac\{e\^\{x_i\}\}\{\\sum_\{j\} e\^\{x_j\}\} \\\]
### 使用 -torch.inf 的原因
### 1. 确保掩码位置在 Softmax 之后变为 0
当你将一个位置的值设置为 \\(-\\text\{torch.inf\}\\)，在进行指数运算时，这个值将趋近于 0，因为 \\( e\^\{-\\infty\} \\approx 0 \\)。这样，在 Softmax 的分母中，这个位置对总和几乎没有贡献，从而使得其对应的 Softmax 输出值也接近于 0。这意味着这些位置不会对最终的注意力权重产生影响。
如果使用 0 来填充掩码位置，虽然对于大部分正常的注意力分数来说不会有太大的影响，但它可能会在计算中给这些位置一些非零的权重，从而导致不正确的注意力分布。
### 2. 避免数值不稳定性
使用负无穷大值填充掩码位置可以避免数值不稳定性问题。在计算注意力分数时，如果填充值为 0，那么即使掩码位置的分数不是实际的注意力分数，也可能在 Softmax 之后有较大的值，这会影响模型的表现。而 \\(-\\text\{torch.inf\}\\) 确保这些值在指数计算后为 0，从而稳定了计算过程。
### 例子
假设我们有以下注意力分数矩阵（attn_scores）和一个掩码矩阵：
```python
import torch

# 假设 context_length 为 3
context_length = 3

# 示例的注意力分数矩阵
attn_scores = torch.tensor([[1.0, 2.0, 3.0],
                            [1.0, 2.0, 3.0],
                            [1.0, 2.0, 3.0]])

# 创建上三角掩码矩阵
mask = torch.triu(torch.ones(context_length, context_length), diagonal=1)

# 使用 -torch.inf 填充掩码位置
masked = attn_scores.masked_fill(mask.bool(), -torch.inf)

print("掩码后的注意力分数矩阵：")
print(masked)

```
输出的掩码后的注意力分数矩阵为：
```plain text
tensor([[  1., -inf, -inf],
        [  1.,   2., -inf],
        [  1.,   2.,   3.]])

```
然后在计算 Softmax 时，负无穷大值的位置将会变成 0，从而不影响最终的注意力权重。
总结起来，使用 \\(-\\text\{torch.inf\}\\) 而不是 0 来填充掩码位置，可以确保这些位置在 Softmax 之后不会对结果产生影响，保证了注意力机制的正确性和数值稳定性。

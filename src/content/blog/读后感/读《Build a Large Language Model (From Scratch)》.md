---
title: '读《Build a Large Language Model (From Scratch)》'
description: 'Build a Large Language Model (From Scratch)'
pubDate: 'May 06 2024'
heroImage: '../../../assets/i_12.jpg'
---

<unknown url="https://app.notion.com/p/5a3311b87e9044bcb8eb7fc4558f5ef5#919cd4d356ed471997e1f7412a5fbb3a" alt="external_object_instance"/>
本来 LLM 是为翻译设计的，没想到配合海量数据产生了涌现。GPT 我认为最大的突破就在于预测下一个单词这种训练模式，可以把海量的文本变成天然的监督学习数据，原来监督学习数据需要打标签，不可能这么多。
### 准备输入数据
LLM 在预训练时不可能直接训练原始文本，由于文本并不能直接参与计算，需要利用“嵌入”技术把原始文本转换为张量。LLM 往往使用自己训练的嵌入模型，而不是用 Word2Vec ，是因为其对特定任务进行了优化。
需要构建所谓的“嵌入”作为输入。
为了让读者理解原理，故特意构建了自己的分词器。以一篇短篇小说的词汇构建词汇表，没有的词汇（很显然短篇小说不可能包含英语的全部词汇）和分隔两个文本单独用特殊符号代替（"\<\|endoftext\|\>", "\<\|unk\|\>”）。
```python
all_words = sorted(list(set(preprocessed)))
```
词汇表是排序然后去重，结果类似。
```python
('!', 0)
('"', 1)
("'", 2)
('(', 3)
(')', 4)
```
encode 和 decode 都会用到 int_to_str ，这样就建立了字符串和整数的关系。
知道原理后，来看看真实世界的例子，实际使用 tiktoken 进行生成嵌入，其中怎么建立字符串和整数的关系应该和上文类似。
```python
tokenizer = tiktoken.get_encoding("gpt2")

text = "Hello, do you like tea? <|endoftext|> In the sunlit terraces of someunknownPlace."

integers = tokenizer.encode(text, allowed_special={"<|endoftext|>"})

print(integers)
```

GPT 模型的训练方式就是预测下一个单词，所以自然使用滑动窗口，举个例子：句子是 What is up 如果窗口是2，步长是1，则问题是 What is，答案是 is up。
**嵌入**
首先嵌入层是 LLM 的一部分，随着 LLM 进行训练更新，而且嵌入看起来复杂，其实就是 one-hot 。
**绝对位置和相对位置**
GPT-2 使用绝对位置嵌入，所以我们只创建另一个嵌入层。
```python
context_length = max_length
pos_embedding_layer = torch.nn.Embedding(context_length, output_dim)

pos_embeddings = pos_embedding_layer(torch.arange(max_length))
# torch.arange(max_length) -> tensor([0, 1, 2, 3])
print(pos_embeddings.shape)
```
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/1fdfa0b4-531c-4865-8882-45ddc2bfe1b7/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830325f636f6d707265737365642f31382e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=4fe4db3a115c6abb6c4d92f0f886e099f3932704f901f27b230177f4bd10d8ca&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.fc9ff0ff-d90d-446e-9325-962b3befa3a8.f0b6533a-5f55-4686-98e9-32d10eb4212b)
总结，输入嵌入 = 单词嵌入+ 位置嵌入
### 自注意力机制
自注意力机制中的 Q、K、V，你可以理解为这是对于同一个输入进行3次不同的线性变换来表示其不同的3种状态。

如图3所示，在经过上述过程计算得到了这个注意力[权重矩阵](https://www.zhihu.com/search?q=%E6%9D%83%E9%87%8D%E7%9F%A9%E9%98%B5&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2466825259%7D)之后我们不禁就会问到，这些权重值到底表示的是什么呢？对于权重矩阵的第1行来说，0.7表示的就是“我”与“我”的注意力值；0.2表示的就是“我”与”是”的注意力值；0.1表示的就是“我”与“谁”的注意力值。换句话说，在对序列中的“我“进行编码时，应该将0.7的注意力放在“我”上，0.2的注意力放在“是”上，将0.1的注意力放在谁上。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/66b7cd41-75f2-49c2-a785-47c885952ad8/v2-286687636530918c6596f46a9f7e37a9_720w.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=3b34e49284ee3abf49f71dca8389f0ef9ef730abfb43ae6d1e8f2d83c7486825&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.3d1981b1-c3c4-42fb-ae8c-cf04bb81f2a6.f0b6533a-5f55-4686-98e9-32d10eb4212b)

**没有可训练权重的注意力（简化版）**
用于输入的其中一项和其他项产生关系。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/8473eb54-bf19-4f60-ac1e-a0ebf1b71885/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830335f636f6d707265737365642f30372e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=aeb34bbc9fb16bdb47d689ddd1fd884d05e45f1f0030d1028e4dc6cc45aaff11&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.0bb75637-f247-4d7f-bcbd-e2e460dae3d0.f0b6533a-5f55-4686-98e9-32d10eb4212b)
注意力权重最后需要归一化，按照惯例，非归一化的注意力权重被称为“注意力分数”，而归一化的注意力分数（总和为 1）被称为“注意力权重”
```python
import torch

inputs = torch.tensor(
  [[0.43, 0.15, 0.89], # Your     (x^1)
   [0.55, 0.87, 0.66], # journey  (x^2)
   [0.57, 0.85, 0.64], # starts   (x^3)
   [0.22, 0.58, 0.33], # with     (x^4)
   [0.77, 0.25, 0.10], # one      (x^5)
   [0.05, 0.80, 0.55]] # step     (x^6)
)
query = inputs[1]  # 2nd input token is the query

attn_scores_2 = torch.empty(inputs.shape[0])
for i, x_i in enumerate(inputs):
    attn_scores_2[i] = torch.dot(x_i, query) # dot product (transpose not necessary here since they are 1-dim vectors)

print(attn_scores_2)
```
以第2个元素举例，注意力的本质就是输入本身和包括自己在内的元素进行点积。
> 注意力计算本质就是计算点积
> 点积本质上是将两个向量元素相乘并将结果乘积求和的简写
然后进行归一化（娱乐版）。
```python
attn_weights_2_tmp = attn_scores_2 / attn_scores_2.sum()

print("Attention weights:", attn_weights_2_tmp)
print("Sum:", attn_weights_2_tmp.sum())
```
实际会使用 softmax 进行归一化，该函数在处理极端值方面更好，并且在训练期间具有更理想的梯度属性。
```python
attn_weights_2 = torch.softmax(attn_scores_2, dim=0)

print("Attention weights:", attn_weights_2)
print("Sum:", attn_weights_2.sum())
```
通过将嵌入的输入标记与注意力权重相乘来计算上下文向量，并将结果向量求和。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/1f5642ca-aab4-47a3-9569-250f3fc3aa3b/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830335f636f6d707265737365642f31302e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=6f1ccd0cbb8b0d456fdd4ecd587d14155a0e13b7cb208ed465ebcf2098049ab5&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.f1bd9643-f6e3-4746-b087-798b9eeb14a1.f0b6533a-5f55-4686-98e9-32d10eb4212b)
计算了输入 2 的注意力权重和上下文向量，接下来，推广此计算以计算所有注意力权重和上下文向量。
到目前为止，上下文分数是其中一个输入和当前值的点积。

### **使用可训练的权重实现自我注意力**
与前面最显着的区别是引入了在模型训练期间更新的注意力权重矩阵。
初始化三个权重矩阵
```python
torch.manual_seed(123)

W_query = torch.nn.Parameter(torch.rand(d_in, d_out), requires_grad=False)
W_key   = torch.nn.Parameter(torch.rand(d_in, d_out), requires_grad=False)
W_value = torch.nn.Parameter(torch.rand(d_in, d_out), requires_grad=False)
# shape is 3 * 2
```
> 出于说明目的，我们设置 `requires_grad=False` 了减少输出中的干扰，但是如果我们要使用权重矩阵进行模型训练时，我们将设置为 `requires_grad=True` 在模型训练期间更新这些矩阵
接下来，计算查询、键和值向量
```python
keys = inputs @ W_key 
values = inputs @ W_value

print("keys.shape:", keys.shape)
print("values.shape:", values.shape)
# keys.shape: torch.Size([6, 2])
# values.shape: torch.Size([6, 2])
```
还是以第二个输入为例子
```python
attn_scores_2 = query_2 @ keys.T # All attention scores for given query
print(attn_scores_2)
```
下一步进行归一化，与前面的区别在于，我们现在通过将注意力分数除以嵌入维度的平方根来缩放注意力分数
```python
d_k = keys.shape[1]
attn_weights_2 = torch.softmax(attn_scores_2 / d_k**0.5, dim=-1)
print(attn_weights_2)
```
最后得出输入 2 的上下文向量（首次引入 value）
```python
context_vec_2 = attn_weights_2 @ values
print(context_vec_2)
```
### **用因果关系隐藏未来预测**
其实就是让输入后面的注意力上下文为 0 ，目的是后面的输入不要影响整体注意力上下文。

### **将单头注意力扩展到多头注意力**
不过从上面的计算结果还可以看到一点就是，**「模型在对当前位置的信息进行编码时，会过度的将注意力集中于自身的位置」**（虽然这符合常识，但并不正确）而可能忽略了其它位置。因此，作者采取的一种解决方案就是采用多头注意力机制（MultiHeadAttention）。
所谓的多头注意力机制其实就是将原始的输入序列进行多组的自注意力处理过程；然后再将每一组自注意力的结果拼接起来（cat）进行一次线性变换得到最终的输出结果。

```python
class MultiHeadAttentionWrapper(nn.Module):

    def __init__(self, d_in, d_out, context_length, dropout, num_heads, qkv_bias=False):
        super().__init__()
        self.heads = nn.ModuleList(
            [CausalAttention(d_in, d_out, context_length, dropout, qkv_bias) 
             for _ in range(num_heads)]
        )

    def forward(self, x):
        return torch.cat([head(x) for head in self.heads], dim=-1)
```

### 构建 LLM
其中模型的配置
```python
GPT_CONFIG_124M = {
    "vocab_size": 50257,    # Vocabulary size
    "context_length": 1024, # Context length
    "emb_dim": 768,         # Embedding dimension
    "n_heads": 12,          # Number of attention heads
    "n_layers": 12,         # Number of layers
    "drop_rate": 0.1,       # Dropout rate
    "qkv_bias": False       # Query-Key-Value bias
}
```
- `"vocab_size"`表示词汇量为 50,257 个单词，由第 2 章中讨论的 BPE 分词器支持
- `"context_length"` 表示模型的最大输入标记计数，由第 2 章中介绍的位置嵌入启用
- `"emb_dim"` 是令牌输入的嵌入大小，将每个输入令牌转换为 768 维向量
- `"n_heads"` 是多头注意力机制中的注意力头数
- `"n_layers"` 是模型中 **transformer** 块的数量，将在后面实现
- `"drop_rate"` 是 dropout 的强度，0.1 表示在训练期间丢弃 10% 的隐藏单位以减轻过度拟合
- `"qkv_bias"` 决定在计算查询 （Q）、键 （K） 和值 （V） 张量时，多头注意力机制中的 `Linear` 层是否应包含偏置向量; 将禁用此选项，这是现代 LLMs 的标准做法;

LLM 的整体架构其实很简单，之所以巨大是因为参数量庞大
```python
import torch
import torch.nn as nn


class DummyGPTModel(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.tok_emb = nn.Embedding(cfg["vocab_size"], cfg["emb_dim"])
        self.pos_emb = nn.Embedding(cfg["context_length"], cfg["emb_dim"])
        self.drop_emb = nn.Dropout(cfg["drop_rate"])
        
        # Use a placeholder for TransformerBlock
        self.trf_blocks = nn.Sequential(
            *[DummyTransformerBlock(cfg) for _ in range(cfg["n_layers"])])
        
        # Use a placeholder for LayerNorm
        self.final_norm = DummyLayerNorm(cfg["emb_dim"])
        self.out_head = nn.Linear(
            cfg["emb_dim"], cfg["vocab_size"], bias=False
        )

    def forward(self, in_idx):
        batch_size, seq_len = in_idx.shape
        tok_embeds = self.tok_emb(in_idx)
        pos_embeds = self.pos_emb(torch.arange(seq_len, device=in_idx.device))
        x = tok_embeds + pos_embeds
        x = self.drop_emb(x)
        x = self.trf_blocks(x)
        x = self.final_norm(x)
        logits = self.out_head(x)
        return logits


class DummyTransformerBlock(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        # A simple placeholder

    def forward(self, x):
        # This block does nothing and just returns its input.
        return x


class DummyLayerNorm(nn.Module):
    def __init__(self, normalized_shape, eps=1e-5):
        super().__init__()
        # The parameters here are just to mimic the LayerNorm interface.

    def forward(self, x):
        # This layer does nothing and just returns its input.
        return x
```
先写个类似单元测试实际测试一下
首先使用 tiktoken 进行嵌入样例文本
```python
import tiktoken

tokenizer = tiktoken.get_encoding("gpt2")

batch = []

txt1 = "Every effort moves you"
txt2 = "Every day holds a"

batch.append(torch.tensor(tokenizer.encode(txt1)))
batch.append(torch.tensor(tokenizer.encode(txt2)))
batch = torch.stack(batch, dim=0)
print(batch)
```
实际测试
```python
torch.manual_seed(123)
model = DummyGPTModel(GPT_CONFIG_124M)

logits = model(batch)
print("Output shape:", logits.shape)
print(logits)
```
其中有很多 “dummy” 层就是没实现的层，来一步步实现。

先实现 LayerNorm
- 将将神经网络层的激活（就是计算结果）集中在平均值 0 周围，并将其方差归一化为 1。
- 这样可以稳定训练，并能够更快地收敛到有效参数。（对抗梯度消失或爆炸）
```python
class LayerNorm(nn.Module):
    def __init__(self, emb_dim):
        super().__init__()
        self.eps = 1e-5
        self.scale = nn.Parameter(torch.ones(emb_dim))
        # 参数可以被优化器更新（训练）
        self.shift = nn.Parameter(torch.zeros(emb_dim))

    def forward(self, x):
        mean = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        norm_x = (x - mean) / torch.sqrt(var + self.eps)
        return self.scale * norm_x + self.shift
```

接着实现前馈网络
前馈网络中含有激活函数，在深度学习中，ReLU 激活函数因其在各种神经网络架构中的简单性和有效性而被普遍使用，在 LLMs中，除了传统的 ReLU 之外，还使用了各种其他类型的激活函数。两个值得注意的例子是 GELU（高斯误差线性单元）和 SwiGLU。
GELU vs ReLU 图像比较
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/fabe96c4-3c48-43d0-afe3-ca36dfd9f7fd/%E4%B8%8B%E8%BD%BD.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=2111b4831f44f4d55fe999261f2610819be51949775bbd4167d77c567db9b695&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.8d77d659-e18b-418f-9c89-a9e2af269920.f0b6533a-5f55-4686-98e9-32d10eb4212b)
```python
class FeedForward(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(cfg["emb_dim"], 4 * cfg["emb_dim"]),
            GELU(),
            nn.Linear(4 * cfg["emb_dim"], cfg["emb_dim"]),
        )

    def forward(self, x):
        return self.layers(x)
```
前馈网络非常有用，它想通过一个线性层升维，GELU 后再降维。
组装 **transformer**
```python
from previous_chaptersimport MultiHeadAttention


class TransformerBlock(nn.Module):
def __init__(self, cfg):
        super().__init__()
        self.att= MultiHeadAttention(
            d_in=cfg["emb_dim"],
            d_out=cfg["emb_dim"],
            context_length=cfg["context_length"],
            num_heads=cfg["n_heads"],
            dropout=cfg["drop_rate"],
            qkv_bias=cfg["qkv_bias"])
        self.ff= FeedForward(cfg)
        self.norm1= LayerNorm(cfg["emb_dim"])
        self.norm2= LayerNorm(cfg["emb_dim"])
        self.drop_shortcut= nn.Dropout(cfg["drop_rate"])

def forward(self, x):
# Shortcut connection for attention blockshortcut= x
        x= self.norm1(x)
        x= self.att(x)# Shape [batch_size, num_tokens, emb_size]x= self.drop_shortcut(x)
        x= x+ shortcut# Add the original input back# Shortcut connection for feed forward blockshortcut= x
        x= self.norm2(x)
        x= self.ff(x)
        x= self.drop_shortcut(x)
        x= x+ shortcut# Add the original input backreturn x
```

组装真实模型，其中有
- n_layers（12）个 Transformer 层
	- 一个 Transformer 层有 n_heads（12）个注意力头
- 一个 LayerNorm 层
```python
class GPTModel(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.tok_emb = nn.Embedding(cfg["vocab_size"], cfg["emb_dim"])
        self.pos_emb = nn.Embedding(cfg["context_length"], cfg["emb_dim"])
        self.drop_emb = nn.Dropout(cfg["drop_rate"])
        
        self.trf_blocks = nn.Sequential(
            *[TransformerBlock(cfg) for _ in range(cfg["n_layers"])])
        
        self.final_norm = LayerNorm(cfg["emb_dim"])
        self.out_head = nn.Linear(
            cfg["emb_dim"], cfg["vocab_size"], bias=False
        )

    def forward(self, in_idx):
        batch_size, seq_len = in_idx.shape
        tok_embeds = self.tok_emb(in_idx)
        pos_embeds = self.pos_emb(torch.arange(seq_len, device=in_idx.device))
        x = tok_embeds + pos_embeds  # Shape [batch_size, num_tokens, emb_size]
        x = self.drop_emb(x)
        x = self.trf_blocks(x)
        x = self.final_norm(x)
        logits = self.out_head(x)
        return logits
```
测试生成文本
```python
def generate_text_simple(model, idx, max_new_tokens, context_size):
    # idx is (batch, n_tokens) array of indices in the current context
    for _ in range(max_new_tokens):
        
        # Crop current context if it exceeds the supported context size
        # E.g., if LLM supports only 5 tokens, and the context size is 10
        # then only the last 5 tokens are used as context
        idx_cond = idx[:, -context_size:]
        
        # Get the predictions
        with torch.no_grad():
            logits = model(idx_cond)
        
        # Focus only on the last time step
        # (batch, n_tokens, vocab_size) becomes (batch, vocab_size)
        logits = logits[:, -1, :]  

        # Apply softmax to get probabilities
        probas = torch.softmax(logits, dim=-1)  # (batch, vocab_size)

        # Get the idx of the vocab entry with the highest probability value
        idx_next = torch.argmax(probas, dim=-1, keepdim=True)  # (batch, 1)

        # Append sampled index to the running sequence
        idx = torch.cat((idx, idx_next), dim=1)  # (batch, n_tokens+1)

    return idx
    
start_context = "Hello, I am"

encoded = tokenizer.encode(start_context)
print("encoded:", encoded)

encoded_tensor = torch.tensor(encoded).unsqueeze(0)
print("encoded_tensor.shape:", encoded_tensor.shape)


model.eval() # disable dropout

out = generate_text_simple(
    model=model,
    idx=encoded_tensor, 
    max_new_tokens=6, 
    context_size=GPT_CONFIG_124M["context_length"]
)

print("Output:", out)
print("Output length:", len(out[0]))

decoded_text = tokenizer.decode(out.squeeze(0).tolist())
print(decoded_text)

# Hello, I am Featureiman Byeswickattribute argue
```
> 请注意，该模型未经训练; 因此随机输出文本
### 训练 LLM
整体的训练如下
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/cc3d9bc4-691f-49e5-aa9d-5b5f94f4fec3/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830355f636f6d707265737365642f6d656e74616c2d6d6f64656c2d2d302e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=116c6dc309f9e3eb9599eb2cababb5555e6f0744225626f828bf959e6a3b483c&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.2a2ab405-3223-4126-a658-49afe03121eb.f0b6533a-5f55-4686-98e9-32d10eb4212b)
首先尝试用未训练的模型生成文本，发现结果并不尽人意（意料之中）。

**计算文本生成损失****（损失函数）**
需要以数字形式衡量或捕获什么是“好文本”，以便在训练期间对其进行跟踪。
为了训练模型，我们需要知道它离正确的预测（目标）有多远。
以如下文本做实验
```python
inputs = torch.tensor([[16833, 3626, 6100],   # ["every effort moves",
                       [40,    1107, 588]])   #  "I really like"]

targets = torch.tensor([[3626, 6100, 345  ],  # [" effort moves you",
                        [588,  428,  11311]]) #  " really like chocolate"]
```
inputs 是输入文本。targets 是想要输出的文本。
```python
with torch.no_grad():
    logits = model(inputs)

probas = torch.softmax(logits, dim=-1) # Probability of each token in vocabulary
print(probas.shape) # Shape: (batch_size, num_tokens, vocab_size)
```
用模型以 inputs 作为输入生成一个单词（其实是 token）。
```python
text_idx = 0
target_probas_1 = probas[text_idx, [0, 1, 2], targets[text_idx]]
print("Text 1:", target_probas_1)

text_idx = 1
target_probas_2 = probas[text_idx, [0, 1, 2], targets[text_idx]]
print("Text 2:", target_probas_2)
```
比较生成的文本和 targets ，如果模型训练良好则数值应该接近 1（概率 100%），然而
```python
Text 1: tensor([7.4541e-05, 3.1061e-05, 1.1563e-05])
Text 2: tensor([3.9836e-05, 1.6783e-05, 4.7559e-06])
```

> 在数学优化中，最大化概率分数的对数比概率分数本身更容易。
> 在深度学习中，不是最大化平均对数概率，而是最小化负平均对数概率值的标准约定;在我们的例子中，在深度学习中，我们不是最大化 -10.7722 以使其接近 0，而是最小化 10.7722 以使其接近 0 。
> 不懂就当作公理吧。
```python
# Compute logarithm of all token probabilities
log_probas = torch.log(torch.cat((target_probas_1, target_probas_2)))
print(log_probas)

# Calculate the average probability for each token
avg_log_probas = torch.mean(log_probas)
print(avg_log_probas)
# tensor(-10.7722)
neg_avg_log_probas = avg_log_probas * -1
print(neg_avg_log_probas)
# tensor(10.7722)
```
上述讲的是 `cross_entropy` ，PyTorch 已经实现了执行上述步骤的 `cross_entropy` 函数，细节不懂没关系。
```python
loss = torch.nn.functional.cross_entropy(logits_flat, targets_flat)
print(loss)
# tensor(10.7722)
```
可以看到内建的 `cross_entropy` 函数和上述计算的相同。

**训练**
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/b17752d4-c04a-458a-bd28-0a339cefa888/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830355f636f6d707265737365642f747261696e2d73746570732e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=d98dee945f86a8150f7c9f7914d852bd4beeb53a00063138fe44f7332ee6e6df&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.f68c8102-e802-4f5d-b612-11326a94d75b.f0b6533a-5f55-4686-98e9-32d10eb4212b)
```python
def train_model_simple(model, train_loader, val_loader, optimizer, device, num_epochs,
                       eval_freq, eval_iter, start_context, tokenizer):
    # Initialize lists to track losses and tokens seen
    train_losses, val_losses, track_tokens_seen = [], [], []
    tokens_seen, global_step = 0, -1

    # Main training loop
    for epoch in range(num_epochs):
        model.train()  # Set model to training mode
        # 同一份数据训练多（10）次
        for input_batch, target_batch in train_loader:
		        # 进入数据迭代
            optimizer.zero_grad() 
            # Reset loss gradients from previous epoch
            # 每轮训练都重置梯度
            loss = calc_loss_batch(input_batch, target_batch, model, device)
            loss.backward() # Calculate loss gradients
            optimizer.step() # Update model weights using loss gradients
            tokens_seen += input_batch.numel()
            global_step += 1

            # Optional evaluation step
            # 非必要逻辑
            if global_step % eval_freq == 0:
                train_loss, val_loss = evaluate_model(
                    model, train_loader, val_loader, device, eval_iter)
                train_losses.append(train_loss)
                val_losses.append(val_loss)
                track_tokens_seen.append(tokens_seen)
                print(f"Ep {epoch+1} (Step {global_step:06d}): "
                      f"Train loss {train_loss:.3f}, Val loss {val_loss:.3f}")

        # Print a sample text after each epoch
        generate_and_print_sample(
            model, tokenizer, device, start_context
        )

    return train_losses, val_losses, track_tokens_seen


def evaluate_model(model, train_loader, val_loader, device, eval_iter):
    model.eval()
    with torch.no_grad():
        train_loss = calc_loss_loader(train_loader, model, device, num_batches=eval_iter)
        val_loss = calc_loss_loader(val_loader, model, device, num_batches=eval_iter)
    model.train()
    return train_loss, val_loss


def generate_and_print_sample(model, tokenizer, device, start_context):
    model.eval()
    context_size = model.pos_emb.weight.shape[0]
    encoded = text_to_token_ids(start_context, tokenizer).to(device)
    with torch.no_grad():
        token_ids = generate_text_simple(
            model=model, idx=encoded,
            max_new_tokens=50, context_size=context_size
        )
        decoded_text = token_ids_to_text(token_ids, tokenizer)
        print(decoded_text.replace("\n", " "))  # Compact print format
    model.train()
    
torch.manual_seed(123)
model = GPTModel(GPT_CONFIG_124M)
model.to(device)
# 优化器，更新模型参数（权重）（model.parameters()）
optimizer = torch.optim.AdamW(model.parameters(), lr=0.0004, weight_decay=0.1)

num_epochs = 10
train_losses, val_losses, tokens_seen = train_model_simple(
    model, train_loader, val_loader, optimizer, device,
    num_epochs=num_epochs, eval_freq=5, eval_iter=5,
    start_context="Every effort moves you", tokenizer=tokenizer
)
# Ep 10 (Step 000085): Train loss 0.391, Val loss 6.452
# Every effort moves you know," was one of the axioms he laid down across the Sevres and silver of an exquisitely appointed luncheon-table, when, on a later day, I had again run over from Monte Carlo; and Mrs. Gis
```
从 Ep1 到 Ep10 训练的损失越来越小，生成的文本越来越符合语法规则。
训练的损失和验证的损失，训练损失持续下降而验证不变，可知训练过拟合了，这里发生过拟合是因为我们有一个非常非常小的训练集，并且我们迭代了很多次。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/d2adcfa4-3e08-438b-af56-62b307c21bd2/%E4%B8%8B%E8%BD%BD_%281%29.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=b37133d2fa0ad1a233abfead05d42aee18ccb03f4bf0749e2bd2893ce3ca50ae&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.4342ae9f-73b6-4cb5-8fe3-a6e98f881268.f0b6533a-5f55-4686-98e9-32d10eb4212b)
可以用以下方法进行优化。
**Temperature**
```python
def softmax_with_temperature(logits, temperature):
    scaled_logits = logits / temperature
    return torch.softmax(scaled_logits, dim=0)

# Temperature values
temperatures = [1, 0.1, 5]  # Original, higher confidence, and lower confidence

# Calculate scaled probabilities
scaled_probas = [softmax_with_temperature(next_token_logits, T) for T in temperatures]
```
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/b2b9b975-5aea-437e-830b-96a794665070/%E4%B8%8B%E8%BD%BD.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=39a1d434c195e29c9ae7c13cee9156e7a0dc13d07a3d47194a41466dfb895ddd&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.d504f57c-c71e-418d-bddd-fb3b841a2234.f0b6533a-5f55-4686-98e9-32d10eb4212b)
> 可以看到，通过 temperature 0.1 进行重新缩放会导致更清晰的分布，接近 `torch.argmax` ，因此几乎总是选择最有可能的单词
> 通过 temperature 5 重新缩放的概率分布更均匀

**Top-k sampling**
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/d9a63c34-4d0d-42dc-9820-8822b188bd80/68747470733a2f2f73656261737469616e72617363686b612e636f6d2f696d616765732f4c4c4d732d66726f6d2d736372617463682d696d616765732f636830355f636f6d707265737365642f746f706b2e77656270.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=dceaa99038286b4283b3738f3085c855e76ac5ed4a98120a91701b5cc9450643&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.c6a9c63c-5ef2-452b-9be7-bdf7c17e2129.f0b6533a-5f55-4686-98e9-32d10eb4212b)
通过为非 top-k 位置分配零概率，确保下一个 token 总是从 top-k 位置采样。

### **文本分类的微调**
分类微调模型只能预测它在训练期间看到的类（例如，“垃圾邮件”或“非垃圾邮件”），而指令微调模型通常可以执行许多任务。
注意，微调往往使用监督学习。
准备数据，下载并解压缩数据集。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/f0b6533a-5f55-4686-98e9-32d10eb4212b/37e949a7-0f16-4caa-9be8-13fdca3e7f7b/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE_2024-05-14_115620.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RCKUZAVQ%2F20261013%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261013T125557Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENT%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIQDRTWIy9NWoiF3cjWlWEVEbg2WQgQMQrVx6oKhyxSLJqQIge3jVtqCjj0fQQ8QwYUxsJynt8cp9toE9XdOz%2FuGk8bkqiAQInf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw2Mzc0MjMxODM4MDUiDNQJNmYzegCGo6Y1xCrcA1jEL2HgdTaIlE%2F2Hs7zQEWHNT88wvRKUkg4xqUL6AXW32ZnEpDzsqdpGgyRMj6VQogxyVvut37s5oyJOYjSasnXy5SaMSG8C8O1JWXfsxFU%2FykiBLYHSHmIIo3%2BkSF08DLjnTl9sEefuXDWoxI1CDtnCywCxVNJjh3uaVlyey%2FQItmWxhrDlYuOQnEKCfX8kH70wXlVo71bYUXZiOfMKQn5h3K3J46raV9ci%2FvePzhMEGsSdo1shqt8AnumJNY%2FgCLNRpNlmIzhg58%2B4NN6uGExK08OcV0spMShN70wEx5xdl4jJ%2Fuv5ynTEkzL2fgolqR7%2BJ7vHOke8FhOX7hYYHd62QTnSQgQ1lOBqN2rjL2cOM1bAzX4gjY5IVDFPmr10w7E%2FwfUlziN8Z4%2FPi8i%2BaYUbHrNOtZFUoIMqhgE5Azd1jQWA2%2BVZlxAr4RyVk0ZJrWcoK7eF%2BPstUrWZQG0waWPDOl0H01kPNQNvxpi7RNPyai0K1YEV89Yh8cpq8kR8XUE9WsHqNJjgXgejWfoHX6XE6%2FD6yOC9PFJLdY3tiKCeOKEUbLbl2Ye6inyrfRkXGVWWBBnfd%2ByXgn4GWHmH2mTabuCVS7CzeVKjW3mTOgFpHJwbCQfO9eKdumMMMexuNYGOqUBwYVt4WVofYBiOJKs%2B1RgT5vlyxsCrsqrqccM5%2FdNT2PEI7XL23DabORR5rmvzcG83KrAp6cscFobRVFD182g1U0WYFDxh2%2Brzr7BWj9JaIvOOVshl1s6mEKe185Xn25gEEyi7LDot8UOwMNMrB3XLZodXzgH7IJKyxXJdyf3pzYWPZlKORopzsuMm%2FxfH5icJwD9%2F1GyHo8D295Y7SBWjxqin2Tr&X-Amz-Signature=87e4192327a7ac7d1b01a90a30d8eeecf5e7880a01d5566abd4a7193279222f9&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.2aab6419-ddd8-4e71-8b2f-ebf97f6040ca.f0b6533a-5f55-4686-98e9-32d10eb4212b)
微调的目标是 gpt2 ，下载 gpt2 的权重并加载进模型。
```python
model_size = CHOOSE_MODEL.split(" ")[-1].lstrip("(").rstrip(")")
settings, params = download_and_load_gpt2(model_size=model_size, models_dir="gpt2")

model = GPTModel(BASE_CONFIG)
load_weights_into_gpt(model, params)
model.eval();
```

目标是替换和微调输出层，为了实现这一点，首先冻结模型，这意味着我们使所有层都不可训练
```python
for param in model.parameters():
    param.requires_grad = False
```
然后，我们替换输出层 （ `model.out_head` ），它最初将层输入映射到 50,257 个维度（词汇表的大小）<br>由于我们对二元分类的模型进行了微调（预测 2 个类，“垃圾邮件”和“非垃圾邮件”），因此我们可以替换如下所示的输出层，默认情况下该层是可训练的。
```python
torch.manual_seed(123)

num_classes = 2
model.out_head = torch.nn.Linear(in_features=BASE_CONFIG["emb_dim"], out_features=num_classes)
```
从技术上讲，仅训练输出层就足够了, 在实验中发现的那样，微调额外的层可以显着提高性能（一开始就忘了，loss 很差而且不收敛）。
因此，我们还使最后一个 Transformer 模块和最后一个连接到 Transformer 层的 `LayerNorm` 模块可训练。
```python
for param in model.trf_blocks[-1].parameters():
    param.requires_grad = True

for param in model.final_norm.parameters():
    param.requires_grad = True
```

**微调的损失函数**
- 在开始微调（/training）之前，我们首先必须定义要在训练期间优化的损失函数
- 目标是最大限度地提高模型的垃圾邮件分类准确性;但是，但分类精度不是一个可微函数
- 因此，将交叉熵损失最小化，作为最大化分类准确性的代理
```python
def calc_loss_batch(input_batch, target_batch, model, device):
    input_batch, target_batch = input_batch.to(device), target_batch.to(device)
    logits = model(input_batch)[:, -1, :]  
    # Logits of last output token
    # 唯一的不同，只关注最后一个 token
    loss = torch.nn.functional.cross_entropy(logits, target_batch)
    return loss
```
> 基于因果注意机制，第 4 个（最后一个）token 包含的信息在所有 token 中最多，因为它是唯一包含所有其他 token 信息的 token 。

**进行微调**
微调和预训练一样。根据损失函数来计算梯度，更新权重。
最后看看微调的效果。
```python
text_1 = (
    "You are a winner you have been specially"
    " selected to receive $1000 cash or a $2000 award."
)

print(classify_review(
    text_1, model, tokenizer, device, max_length=train_dataset.max_length
))
# spam
text_2 = (
    "Hey, just wanted to check if we're still on"
    " for dinner tonight? Let me know!"
)

print(classify_review(
    text_2, model, tokenizer, device, max_length=train_dataset.max_length
))
# not spam
```


> 相关代码 [https://github.com/buhe/llm](https://github.com/buhe/llm)

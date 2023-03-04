---
title: '[NLP] 대화 시스템 (Dialogue System)'

categories:
  - Deep Learning
tags:
  - Deep Learning
  - Natural Language Processing

last_modified_at: 2021-05-01T08:06:00-05:00

classes: wide
---

> Poly-encoders: Transformer Architectures and Pre-training Strategies for Fast and Accurate Multi-sentence Scoring. Samuel Humeau, Kurt Shuster, Marie-Anne Lachaux, Jason Weston. ICLR 2020. [paper](https://arxiv.org/pdf/1905.01969.pdf)

## 1. Introduction

이 논문에서는 multi-sentence scroing을 필요로 하는 task들에 대하여 pre-trained language model followed by fine-tuning 접근을 향상시키고자 합니다.

multi-sentence scroing을 필요로 하는 task : input context가 주어졌을 때, a set of candidate label에 대해서 점수를 매기는(score) 것
retrieval과 dialogue task에서 흔한 setup

이러한 tasks에서의 성능(performance)는 두 축을 통해 측정되어 왔습니다.
- prediction quality
- prediction speed

현재 SOTA는 pre-training을 위해 BERT 모델을 사용하는 데에 초점을 맞추고 있습니다. fine-tuned architecture
- Bi-encoder
    - input과 candidate label에 대하여 개별적으로 self-attention을 수행하고 마지막에 final representation을 위해 이들을 결합합니다.
    - Bi-encoder는 인코딩 된 candidate(encoded candidate)을 cache하고 각각의 input에 대하여 이러한 representation을 재사용할 수 있어 예측 시간이 빠릅니다.
- Cross-encoder
    - 주어진 input과 label candidate에 대하여 full (cross) self-attention을 수행합니다.
    - Cross-encoder는 훨씬 더 높은 정확도를 얻는 경향이 있습니다.
    - Cross-encoder는 각각의 input과 label에 대하여 인코딩을 다시 계산해야 합니다. 결과적으로 Cross-encoder는 test time에서 엄청나게 느립니다.

<!--
we explore improvements to this approach( deep pre-trained language models followed by fine-tuning) for the class of tasks that require multi-sentence scoring: given an input context, score a set of candidate labels, a setup common in retrieval and dialogue tasks, amongst others.

Performance in such tasks has to be measured via two axes: prediction quality and prediction speed, as scoring many candidates can be prohibitively slow.

The current state-of-the-art focuses on using BERT models for pre-training, which employ large text corpora on general subjects: Wikipedia and the Toronto Books Corpus (Zhu et al., 2015). 
Two classes of fine-tuned architecture are typically built on top: Bi-encoders and Cross-encoders. 
- Bi-encoders, which perform self-attention over the input and candidate label separately and combine them at the end for a final representation. 
- As the representations are separate, Bi-encoders are able to cache the encoded candidates, and reuse these representations for each input resulting in fast prediction times.
- Cross-encoders, which perform full (cross) self-attention over a given input and label candidate, tend to attain much higher accuracies than their counterparts, 
- Cross-encoders must recompute the encoding for each input and label; as a result, they are prohibitively slow at test time.
-->
## 2. Related Work

input context가 주어질 때 candidate labels에 대하여 점수를 매기는 task는 머신러닝에서 고전적인 문제입니다.
다중 클래스 분류는 특수한 경우이지만, 더 일반적인 task는 candidate이 이산적인 class가 아닌 structured objects인 경우를 포함합니다. 이 논문에서는 input과 cnadidate label이 sequences of text라고 간주합니다.

**Bi-encoders**
- input과 candidate label을 개별적으로 공통의 feature space로 매핑하는 모델
- input과 candidate label의 유사도를 측정하기 위해 dot product, 코사인 혹은 (parameterized) non-linearity가 사용됩니다.
- vector space models, LSI, supervised embeddings, classical siamese networks가 포합됩니다.
- next utterance prediction task에 대하여, 이 논문에서는 input과 candidate label을 개별적으로/각각 인코딩 하는 LSTMs, CNNs, Memory Networks, Transformer Memory networks를 고려합니다.
- 큰, 고정된 candidate set의 representation을 cache할 수 있다는 것이 장점
- cnadidate 인코딩이 input과 독립적이기 때문에, Bi-encoder는 evaluation 동안 매우 효율적입니다.

**Cross-encoders**

- Cross-encoder : input과 candidate label 간 유사도 scoring 함수에 대하여 어떠한 가정도 하지 않습니다. 대신, input과 candidate을 concatenate한 것이 비선형 함수의 새로운 input으로서 역할을 합니다.
input과 candidate label의 match를 점수를 매기는 (Instead, the concatenation of the input and a candidate serve as a new input to a nonlinear function that scores their match based on any dependencies it wants.)
- Sequential Matching Network CNN-based architectures, Deep Matching Networks, Gated Self-Attention, transformers

- transformer에서, 
 two sequences of text를 concatenate하는 것은 모든 레이어에서 self-attention을 적용하는 것으로 이어집니다. 이것은 input context와 candidate 사이의 풍부한 interaction을 산출합니다. 
 candidatelabel에 있는 모든 단어들이 input context에 있는 모든 단어들을 attend할 수 있고, input context에 있는 모든 단어들이 candidate label에 있는 모든 단어들ㅇ르 attend할 수 있기 때문에.
 - 성능이 더 좋음
 - computational cost 높음

그러나 성능 향상은 엄청난 계산 비용으로 이루어집니다. 교차 인코더 표현은 계산 속도가 훨씬 느려서 일부 응용 프로그램을 실행할 수 없게 됩니다.

<!--
The task of scoring candidate labels given an input context is a classical problem in machine learn- ing. While multi-class classification is a special case, the more general task involves candidates as structured objects rather than discrete classes; in this work we consider the inputs and the candidate labels to be sequences of text.

**Bi-encoders**
There is a broad class of models that map the input and a candidate label separately into a common feature space wherein typically a dot product, cosine or (parameterized) non-linearity is used to measure their similarity. We refer to these models as Bi-encoders. Such methods include 
- vector space models, 
- LSI, 
- supervised embeddings 
- classical siamese networks (Bromley et al., 1994). For the next utterance prediction tasks we consider in this work, several Bi-encoder neural approaches have been con- sidered, in particular Memory Networks (Zhang et al., 2018a) and Transformer Memory networks (Dinan et al., 2019) as well as LSTMs (Lowe et al., 2015) and CNNs (Kadlec et al., 2015) which encode input and candidate label separately. 
A major advantage of Bi-encoder methods is their abil- ity to cache the representations of a large, fixed candidate set. Since the candidate encodings are independent of the input, Bi-encoders are very efficient during evaluation.

**Cross-encoders**
Researchers have also studied a more rich class of models we refer to as Cross-encoders, which make no assumptions on the similarity scoring function between input and candidate label. Instead, the concatenation of the input and a candidate serve as a new input to a nonlinear function that scores their match based on any dependencies it wants. This has been explored with 
- Sequential Matching Network CNN-based architectures (Wu et al., 2017), Deep Matching Networks (Yang et al., 2018), Gated Self-Attention (Zhang et al., 2018b), and most recently transformers (Wolf et al., 2019; Vig & Ramea, 2019; Urbanek et al., 2019). For the latter, concatenating the two sequences of text results in applying self-attention at every layer. This yields rich interactions between the input context and the candidate, as every word in the candidate label can attend to every word in the input context, and vice-versa. 
and finding that Cross-encoders perform better. However, the performance gains come at a steep computational cost. Cross-encoder representations are much slower to compute, rendering some applications infeasible.
-->
## 3. TASKS

이 논문에서는
- sentence selection in dialogue
    - the Neurips ConvAI2 competition
    - the DSTC7 challenge, Track 1 
    - the popular Ubuntu V2 corpus
- article search in IR
    -  the Wikipedia Article Search task 사용
task를 고려합니다.

- ConvAI2 task
    - Persona-Chat dataset(spakers 간 대화를 포함하는 데이터셋)에 기반
    - 각각의 speaker에게 persona(각각의 spaker가 흉내낼 캐릭터를 묘사하는 몇 개의 문장)가 주어지고, 각각의 speaker는 서로를 알아가도록 지시받습니다.


<!--
We consider the tasks of sentence selection in dialogue and article search in IR. 
- The former is a task extensively studied and recently featured in two competitions: 
    - the Neurips ConvAI2 competition (Dinan et al., 2020), and
    - the DSTC7 challenge, Track 1 
    - We compare on those two tasks and in addition, we also test on the popular Ubuntu V2 corpus
- For IR, we use the Wikipedia Article Search task of Wu et al. (2018).
-->
The ConvAI2 task is based on the Persona-Chat dataset (Zhang et al., 2018a) which involves dialogues between pairs of speakers. Each speaker is given a persona, which is a few sentences that describe a character they will imitate, e.g. “I love romantic movies”, and is instructed to get to know the other. Models should then condition their chosen response on the dialogue history and the lines of persona. As an automatic metric in the competition, for each response, the model has to pick the correct annotated utterance from a set of 20 choices, where the remaining 19 were other randomly chosen utterances from the evaluation set. 

The DSTC7 challenge (Track 1) consists of conversations extracted from Ubuntu chat logs, where one partner receives technical support for various Ubuntu-related problems from the other.

Ubuntu V2 is a similar but larger popular corpus, created before the competition (Lowe et al., 2015); we report results for this dataset as well, as there are many existing results on it.

Finally, we evaluate on Wikipedia Article Search. Using the 2016-12-21 dump of English Wikipedia (∼5M articles), the task is given a sentence from an article as a search query, find the article it came from. Evaluation ranks the true article (minus the sentence) against 10,000 other articles using retrieval metrics. This mimics a web search like scenario where one would like to search for the most relevant articles (web documents). 

Table1

## 4. METHODS

### 4.1 Transformers and Pre-training Strategies

이 논문의 Bi-, Cross-, and Poly-encoders는 BERT-base(12 layers, 12 attention heads, a hidden size of 768)와 같은 아키텍처와 차원을 갖는 large pre-trained transformer model입니다.

<!---->
**Transformers**
Our Bi-, Cross-, and Poly-encoders, are based on large pre-trained transformer models with the same architecture and dimension as BERT-base, which has 12 layers, 12 attention heads, and a hidden size of 768. 
As well as considering the BERT pre-trained weights, we also explore our own pre-training schemes. Specifically, we pre-train two more transformers from scratch using the exact same architecture as BERT-base. 
- One uses a similar training setup as in BERT-base, training on 150 million of examples of [INPUT, LABEL] extracted from Wikipedia and the Toronto Books Corpus, 
- The former is performed to verify that reproducing a BERT-like setting gives us the same results as reported previously, 
- while the other is trained on 174 million examples of [INPUT, LABEL] extracted from the online platform Reddit, which is a dataset more adapted to dialogue. 
- while the latter tests whether pre-training on data more similar to the downstream tasks of interest helps. 
For training both new setups we used XLM (Lample & Conneau, 2019).

**Input Representation**
Our pre-training input is the concatenation of input and label [INPUT,LABEL], where both are surrounded with the special token [S],
- When pre-training on Reddit, the input is the context, and the label is the next utterance. 
- When pre-training on Wikipedia and Toronto Books, the input is one sentence and the label the next sentence in the text. 
Each input token is represented as the sum of three embeddings: the token embedding, the position (in the sequence) embedding and the segment embedding. Segments for input tokens are 0, and for label tokens are 1.

**Pre-training Procedure**
Our pre-training strategy involves training with a masked language model (MLM) task identical to the one in Devlin et al. (2019). 
In the pre-training on Wikipedia and Toronto Books we add a next-sentence prediction task identical to BERT training. 
In the pre-training on Reddit, we add a next-utterance prediction task, which is slightly different from the previous one as an utterance can be composed of several sentences. During training 50% of the time the candidate is the actual next sentence/utterance and 50% of the time it is a sentence/utterance randomly taken from the dataset. We alternate between batches of the MLM task and the next-sentence/next- utterance prediction task. Like in Lample & Conneau (2019) we use the Adam optimizer with learning rate of 2e-4, β1 = 0.9, β2 = 0.98, no L2 weight decay, linear learning rate warmup, and inverse square root decay of the learning rate. We use a dropout probability of 0.1 on all layers, and a batch of 32000 tokens composed of concatenations [INPUT, LABEL] with similar lengths. We train the model on 32 GPUs for 14 days.

**Fine-tuning**
After pre-training, one can then fine-tune for the multi-sentence selection task of choice, in our case one of the four tasks from Section 3. We consider three architectures with which we fine-tune the transformer: the Bi-encoder, Cross-encoder and newly proposed Poly-encoder.

### 4.2 BI-ENCODER


## 5. EXPERIMENTS

We perform a variety of experiments to test our model architectures and training strategies over four tasks. For metrics, we measure Recall@k where each test example has C possible candidates to select from, abbreviated to R@k/C, as well as mean reciprocal rank (MRR).

### 5.1 Bi-encoders and Cross-encoders

We first investigate fine-tuning the Bi- and Cross-encoder architectures initialized with the weights provided by Devlin et al. (2019), studying the choice of other hyperparameters (we explore our own pre-training schemes in section 5.3). 
In the case of the Bi-encoder, we can use a large number of neg- atives by considering the other batch elements as negative training samples, avoiding recomputation of their embeddings. On 8 Nvidia Volta v100 GPUs and using half-precision operations (i.e. float16 operations), we can reach batches of 512 elements on ConvAI2. Table 2 shows that in this setting, we obtain higher performance with a larger batch size, i.e. more negatives, where 511 negatives yields the best results. For the other tasks, we keep the batch size at 256, as the longer sequences in those datasets uses more memory. 
The Cross-encoder is more computationally intensive, as the embeddings for the (context, candidate) pair must be recomputed each time. We thus limit its batch size to 16 and provide negatives random samples from the training set. For DSTC7 and Ubuntu V2, we choose 15 such negatives; For ConvAI2, the dataset provides 19 negatives.


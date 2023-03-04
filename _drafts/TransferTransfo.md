---
title: '[NLP] TransferTransfo 논문 정리'

categories:
  - Deep Learning
tags:
  - Deep Learning
  - Natural Language Processing

last_modified_at: 2020-11-11T08:06:00-05:00

classes: wide
use_math: true
---

> TransferTransfo: A Transfer Learning Approach for Neural Network Based Conversational Agents. Thomas Wolf, Victor Sanh, Julien Chaumond, Clement Delangue. NeurIPS 2018 CAI Workshop. [paper](https://arxiv.org/pdf/1901.08149)

## 1. Introduction

non-goal-oriented dialogue systems (chatbots)

RNN based models 문제점
- the wildly inconsistent outputs and the lack of a consistent personality
- the absence of a long-term memory as these models have difficulties to take into account more than the last dialogue utterance
- a tendency to produce consensual and generic responses (e.g. I dont know) which are vague and not engaging for humans

=> more consistent and relevant data-driven conversational agents by proposing a model architecture, associated training and generation algorithms

- (i) relevance of the answer
- (ii) coherence with a predefined personality and dialog history,
- (iii) grammaticality and fluency as evaluated by automatic metrics.

## 2. Tasks and evaluation

- Conversational Intelligence Challenge 21 (ConvAI2) : open-domain conversation agent의 평가하는 대회
- ConvAI2는 PERSONA-CHAT dataset에 기반
- Automatic metrics (3가지)
  1. Perplexity
     - language modeling task에서의 metrics
     - the perplexity of gold utterance tokens as computed from the model’s next token probability predictions
     - PPL로 표기
  2. Accuracy
     - next utterance retrieval task에서의 metrics
     - the accuracy of retrieving a gold next utterance among 19 random distractor responses sampled from other dialogues
     - Hits@1로 표기
  3. F1 (precision and recall)
     - generation task(dialog setting에서 response를 생성하는 것)에서의 metrics
     - the F1 of the content words of a gold dialog utterance in the predicted utterances
     - F1으로 표기
- Human evaluations (4가지)
  1. fluency
  2. consistency
  3. engagingness (each evaluated as a grade between 1 and 5)
  4. whether the human could guess the persona used by the bot (selection between two possible personas)

## 3. Model

## 4. Training

### Pre-training
The model is pre- trained on the BooksCorpus dataset which contains over 7,000 unpublished books (about 800M words) from a variety of genres (Adventure, Fantasy, Romance...). 
The critical choice for this pre-training dataset is to use a document-level corpus rather than a shuffled sentence-level corpus to take advantage of long contiguous sequences and paragraphs and learn to condition on long-range information.

### Fine-tuning
the model is fine-tuned on the PERSONA-CHAT dataset using an augmented input representation and a multi-task learning scheme 

**Input representation**

각각의 utterance에 대한 모델의 sequence of input tokens = concatenating (all the persona sentences of the current speaker + history of the dialog's previous utterances)

sequence of input embeddings = word embeddings + positional embeddings + dialog-state embeddings
word embeddings : learned during the pre-training phase
positional embeddings : learned during the pre-training phase
dialog-state embeddings : learned on the PERSONA-CHAT dataset during the fine-tuning phase. / used to indicate whether the current token is part of (i) a personality sen- tence, (ii) an utterance from PERSON1 or (iii) an utterance from PERSON2. 

Separation tokens may also be added to further separate each utterances of the dialog.

<!--이해 안됨밍,,
Another simple adaptation from pre-training to fine- tuning is to promote an invariance to personality sentence ordering by reusing the same positional embeddings for each personality sentences. This is similar in spirit to the Set Transformer recently proposed in Lee et al.. Self-attention model are inherently insensitive to position and ordering and this feature can be conveniently harnessed to bias toward po- sitional invariance. One interesting invariance that can be observed in conditional dialog datasets like the PERSONA- CHAT dataset is the invariance of the predicted utterances with respect to various orders of the personality sentences conditioning the dialog. A similar effect can be obtained by augmenting the training dataset with copies of the dialogs wherein the personality sentences are shuffled.
-->

**Multi-task learning**
Multi-task learning Fine-tuning is done by optimizing a combination of two loss functions: 
(i) a next-utterance classification loss, and 
(ii) a language modeling loss.

<!--
The next-utterance classification loss is illustrated on fig- ure 2 and bears similarities with the Next Sentence Predic- tion task developed in a parallel work by Devlin et al.. It con- sists in training a classifier to distinguish a correct next utter- ance appended to the input sequence from a set of randomly sampled distractors (in practice between 2 and 6 randomly sampled utterances). The classifier is a linear layer taking as input the last hidden state of the self-attention model and computing a score. For classification a special token [C LS ] is added at the sentence illustrated in blue on figure 2, the last hidden state used for the classifier thus corresponds to the hidden-state associated to this termination special token. The computed scores are passed through a softmax layer to obtain classification probabilities. The parameters of the Transformer and the next-utterance classifier layer are fine- tuned jointly to maximize the log-probability of the correct label.
-->

<!--
The language modeling loss is the commonly used cross- entropy loss where the final hidden state of the self-attention model is fed into an output softmax over the vocabulary to obtain next token probabilities. These probabilities are then scored using a negative log-likelihood loss where the gold next tokens are taken as labels.
-->

**Fine-tuning details**
- We fine-tuned the model with a batch size of 32 sequences having an average of 250 tokens depending on the batch for 200,000 steps, which is approximately 2 epochs over the PERSONA-CHAT training dataset (32 sequences * 250 tokens = 8,000 tokens/batch). 
- We used Adam with a learning rate of 6.25e-5, β1 = 0.9, β2 = 0.999, L2 weight decay of 0,01 and a coefficient of 2 on the Lan- guage Modeling loss when summing with the next-utterance classification loss losses. The learning rate was linearly de- cayed to zero over the course of the training. 
- We use a dropout probability of 0.1 on all layers. 
- we use a relu activation function. 
- Fine-tuning the model took about 10h on four K80 GPUs.

**Decoding details**

<!--beam search?
Generation was performed using beam search with sampling and a small beam size of 4. Simple n-grams filtering is used to ensure the model doesn’t di- rectly copy from the personality sentences (forbidden by the ConvAI2 rules) as well as older utterances. The fi- nal beams are ranked according to a scalar combination of the length-normalized utterance probability and the next- utterance classification score. Increasing the importance of the next-utterance classification score results in utterances that stick more closely to the provided personality sentences but also reduce the diversity of the dialog.
-->
## 5. Results
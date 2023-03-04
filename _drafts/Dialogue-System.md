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

이 글은 희소 표현, 밀집 표현, 그리고 워드 임베딩(Word Embedding)에 관한 기록입니다.

## Dialogue System ; 대화 시스템

### 1. 개념

대화 시스템(dialogue system)은 크게 두 가지로 구분된다. 

### 2. 종류

- Goal-oriented Dialogue System ; 목적 지향형 대화 시스템 = Task-oriented Dialogue System ; 문제 해결형 대화 시스템
    - 비서 역할로서 사용자에게 서비스를 제공
    - 예시 : 빅스비, 구글 어시스턴드, 시리, 알렉사
- Non-goal-oriented Dialogue System = chatbot = Open domain Dialogue System = Open-domain chatbot
    - 사용자에게 지속적인 흥미를 유발하고 자유 주제를 다루는 친구 역할로써 일반적인 대화에 쓰이는 챗봇
    - 예시 : Tay, 이루다

## Goal-oriented Dialogue System

- 전통적인 대화 시스템
    - building blocks : dialoge state tracking(=belief tracking) components + response generator
- tasks with labeled internal dialogue state and precisely defined user intent
- functional goal을 달성하는 데에 관심
- tasks & datasets => constrained to narrow domain (domain dependent)

**belief tracker** : 대화의 매 스텝마다 사용자의 목적을 추정하는 component
Dialogue State Tracking ; DST componenet of Spoken Dialogue System SDS
: interprete user input & update the belief state
beliefe state : system's internal representation of the state of the conversation : 대화 state에 대한 확률 분포, dialogue manaber가 system이 다음에 어떤 action을 추가해야 하는지 결정하는 데에 호라용

### 대회

- The Dialogue State Tracking Challenge (DSTC)

## Non-goal-oriented Dialogue System

자유 주제 대화 시스템(Open domain Dialogue System)은 질문과 대답으로 구성된 프로그램이다. 질문에 대한 대답을 챗봇이 자동으로 생성하는 생성모델(Generative model)과 질문에 대한 대답을 미리 만들어 놓고 답하게 하는 검색
모델(Retrieval-based model)로 나눌 수 있다.

next utterance prediction

### 종류

- Ranking model : 후보 중 선택 
    - ex) Poly-Encoder
- Generative model : 새로운 문장을 생성
    - ex) TransferTransfo

data based 방법론 중 가장 기본적인 것
information retrieval models (IR systems) - ranking model로 볼 수 있음
retrieve and rank response based on matching score with the recent dialogue history

## Retrieval-Based Dialogue System = Ranking model

- 후보 중 선택 
    - ex) Poly-Encoder

- input query $x$가 주어지면, $x$의 candidate answers $y \in Y$ 모두를 rank
- similarity scoring function $sim(x, y)$에 기반하여
- query-document ranking (IR)
- answer selection in QA (NLP)
- dialogue response selection (NLP)

data based 방법론 중 가장 기본적인 것
information retrieval models (IR systems) - ranking model로 볼 수 있음
retrieve and rank response based on matching score with the recent dialogue history

종류
- Single-Turn Matching Models : hypothesize that the response replies to the whole context => they consider the context utterances as one single utterance to which they match the response without explicitly distinguishing the context utterances.
    - Dual Encoder, Enhanced Sequential Inference model(ESIM) 
- Multi-Turn Matching Models
    - the response replies to each utterance of the context => the cnadidate response is matched with every utterance of the context => aggregation function is applied to combine the different matching scores and produce a response score
    - Sequential Matching Network(SMN), Deep Attention Matching Network(DAM), Deep Matching Network(DMN)

## Generative model

- 새로운 문장을 생성
- ex) TransferTransfo
- input text $x$가 주어지면, output text $y$를 generate
- tasks
    - machine translation ; 기계 번역
    - dialogue response generation

## retrieval-based dialogue systems vs. generative dialogue systems
_refine refune참고_

retrieval- based dialogue systems 
- are constrained by a list of candidate responses and can only respond with one of the available responses. 
- they can produce syntactically correct, diverse and long responses. 
Generative dialogue systems 
- are not limited by a responses list and thus, they can generate more specific responses. 
- However, they tend to generate ”safe” responses which are short and general


### 데이터셋

- PERSONA-CHAT
- OpenSubtitles (영화 스크립트 베이스)
- Cornell Movie-Dialogue Corpus (영화 스크립트 베이스)
- Reddit (웹 플랫폼 베이스)
- Twitter (웹 플랫폼 베이스)
- Dialogue NLI
- Ubuntu Dialogue Corpus (UDC)
- E-commmerce Dialouge Corpus (EDC)
- Douban Conversation Corpus
- AliMe

# Benchmark literature survey

Background reading, not the evaluation plan for the paper. The [paper](whitepaper.md) focuses on SWE-bench Lite. Other integrations are deferred. Counts below are a dated, bounded inventory, not current worldwide adoption totals.

#### Publication-count method

This inventory records publications verified as of **8 November 2026**. We count benchmark introductions with evaluations, original empirical uses, audits and studies of identified derivatives. Citations, copied scores and leaderboard entries alone do not qualify. Versions of one paper count once; project articles are listed separately.

Counts are **lower bounds for the listed publications**, not worldwide adoption estimates. Papers can appear in several rows; do not sum the rows. Introductions, audits and derivative studies are distinguished from independent use. The SWE-bench family row groups publications, not scores.

| Benchmark or release family | What it measures / relevance | Research publications verified here | Origin versus subsequent use |
| --- | --- | ---: | --- |
| **SWE-bench / Lite / Verified family** | Existing-repository issue resolution. Strong initial candidate for external comparison if the factory is configured for the selected language and exact split. | **7**: B01–B07 | 1 introduction; 6 subsequent agent/model studies or technical reports. Original, Lite and Verified scores remain separate. |
| **SWE-bench Verified specifically** | Human-filtered Python issue-resolution tasks; suitable for an autonomous repository-repair baseline. | **3**: B05, B06, B07 | All 3 are subsequent model studies/reports with explicit Verified results. This is a subset of the family inventory, not 3 additional papers. |
| **[SWE-bench Multilingual](https://www.swebench.com/multilingual.html)** | Cross-language repository repair; includes Go but does not require restricting evaluation to it. | **1**: B07; **plus 1 project publication**: N01 | 1 subsequent model technical report; N01 is the introducing project article, not counted as a research paper. |
| **Multi-SWE-bench** | Issue resolution across seven languages, with 1,632 instances in the introducing release. Distinct from SWE-bench Multilingual. | **1**: B08 | Introducing paper with baseline evaluations; additional empirical uptake is not quantified by this inventory. |
| **SWE-bench-Live** | Refreshed issue-resolution tasks; relevant to temporal robustness. Freeze an exact release and language split for repeated studies. | **1**: B09 | Introducing paper with agent/model evaluations; later multilingual project releases are not silently treated as the same evaluated split. |
| **SWE-rebench / V2** | Fresh evaluation cohorts and executable task collection; relevant to contamination and environment preparation. | **2**: B10, B11 | Two originating works: B10 evaluates the original benchmark; B11 studies multilingual dataset/environment construction. This does not establish 2 independent uses of one held-out benchmark. |
| **SWE-Bench Pro, original** | Longer-horizon repository work; candidate for testing planning and review under larger changes. | **3**: B12, B13, B17 | 1 introduction; 2 subsequent studies audit or re-evaluate the original benchmark. Audits are not counted as independent factory comparisons. |
| **SWE-Bench Pro V2** | Revised tasks and evaluation restrictions. Consider separately from original Pro. | **1**: B13 | V2 introduction/re-evaluation; no further independent V2 publication is claimed here. |
| **Terminal-Bench 2.0 / 2.1 research** | Terminal-based tasks with environment-level verification; useful beyond code patching and across languages. | **5**: B07, B14, B15, B16, B18 | 1 introduction; 2 agent/model/optimizer evaluations; 1 maintenance audit introducing 2.1; 1 modified-starting-state study. Subsets and altered starting states must be labeled. |
| **DeepSWE** | Original long-horizon repository tasks; potentially relevant to sustained planning/implementation. Confirm artifact access and exact version before selecting. | **2**: B17, B18 | 1 introduction; 1 derivative starting-state study. Does not establish two comparable evaluations of the unmodified full benchmark. |
| **SWE-Lancer** | Freelance engineering and selection among technical proposals; relevant to broader implementation and decision workflows. | **1**: B19 | Introducing paper with evaluations. Proposal-selection results are distinct from implementation results; payout-based scoring is not measured productivity. |

#### Publication inventory and evidence locations

| ID | Publication | Empirical use verified for the counts above |
| --- | --- | --- |
| B01 | [Jimenez et al., *SWE-bench*, ICLR 2024](https://arxiv.org/abs/2310.06770) | Introduces and evaluates repository issue resolution on original SWE-bench. |
| B02 | [Yang et al., *SWE-agent*, 2024](https://arxiv.org/abs/2405.15793v3) | Reports SWE-bench experiments; abstract and evaluation section. Not assigned to Verified solely from later project leaderboards. |
| B03 | [Xia et al., *Agentless*, 2024](https://arxiv.org/abs/2407.01489v2) | Reports SWE-bench Lite results and analyzes a filtered Lite-S variant. Lite-S is not the original Lite score. |
| B04 | [Wang et al., *OpenHands*, ICLR 2025](https://arxiv.org/abs/2407.16741v3) | Software-engineering evaluation includes SWE-bench; counted at family level, not asserted to use Verified. |
| B05 | [Wei et al., *SWE-RL*, NeurIPS 2025](https://arxiv.org/abs/2502.18449v2) | Explicit SWE-bench Verified model evaluation; abstract and main results. |
| B06 | [Yang et al., *Kimi-Dev*, 2025](https://arxiv.org/abs/2509.23045v3) | Explicit SWE-bench Verified evaluations of workflow and agent settings. |
| B07 | [DeepSeek-AI, *DeepSeek-V3.2*, 2025 technical report](https://arxiv.org/html/2512.02556v1#S4) | Main-results table and Appendix C report SWE Verified, SWE Multilingual and Terminal-Bench 2.0. These are model-author measurements, not independent replication. |
| B08 | [Zan et al., *Multi-SWE-bench*, 2025](https://arxiv.org/abs/2504.02605) | Introduces the benchmark and evaluates Agentless, SWE-agent and OpenHands. Multiple baselines in one paper count as one publication. |
| B09 | [Zhang et al., *SWE-bench Goes Live!*, 2025](https://arxiv.org/abs/2505.23419v2) | Introduces and evaluates SWE-bench-Live; agent/model experiments in the original release. |
| B10 | [Badertdinov et al., *SWE-rebench*, 2025](https://arxiv.org/abs/2505.20411v2) | Introduces fresh task collection and agent evaluation. A dated evaluation cohort is not the entire released training corpus. |
| B11 | [*SWE-rebench V2: Language-Agnostic SWE Task Collection at Scale*, 2026](https://arxiv.org/html/2602.23866v2#S4) | Empirical construction, setup and quality-filter experiments; classified as dataset-construction evidence, not independent adoption of a fixed held-out test set. |
| B12 | [Deng et al., *SWE-Bench Pro*, 2025](https://arxiv.org/abs/2509.16941v2) | Introduces long-horizon tasks and evaluates models under a common scaffold. |
| B13 | [*SWE-Bench Pro V2: A Cleaner, Harder-to-Game Coding Benchmark*, 2026](https://arxiv.org/abs/2610.24206) | Audits/revises original Pro and evaluates a modified task set/protocol. Counted as original-Pro audit and V2 introduction, not interchangeable scores. |
| B14 | [Merrill et al., *Terminal-Bench*, 2026](https://arxiv.org/abs/2601.11868) | Introduces the 89-task Terminal-Bench 2.0 release and evaluates models/agents. |
| B15 | [Wang, Kattakinda and Feizi, *Do Agent Optimizers Compound?*, 2026](https://arxiv.org/abs/2607.14004) | Evaluates optimizer treatments using hard Terminal-Bench 2.0 tasks under matched optimization budgets; subset/continual-learning protocol. |
| B16 | [Buchanan et al., *Benchmarks as Software*, 2026](https://arxiv.org/abs/2611.08417) | Audits Terminal-Bench 2.0, releases repairs as 2.1 and evaluates sensitivity to resource budgets; maintenance study. |
| B17 | [Huang et al., *DeepSWE*, 2026](https://arxiv.org/abs/2607.07946) | Introduces/evaluates DeepSWE and reports an audit of original SWE-Bench Pro verification; distinct types of empirical use. |
| B18 | [Li et al., *SWE-Residual*, 2026](https://arxiv.org/html/2610.25899#S5) | Evaluates clean and inherited-work states derived from DeepSWE and Terminal-Bench; a task-state transformation, not an unchanged leaderboard protocol. |
| B19 | [Miserendino et al., *SWE-Lancer*, 2025](https://arxiv.org/abs/2502.12115v4) | Introduces freelance implementation and managerial proposal-selection evaluations. |
| N01 | [Khandpur et al., SWE-bench Multilingual project article](https://www.swebench.com/multilingual.html) | Introduces the dataset and reports SWE-agent baseline results. Project publication; excluded from research-paper counts. |

The inventory contains **19 research papers/technical reports and one project article**. It is not a systematic review or popularity ranking.


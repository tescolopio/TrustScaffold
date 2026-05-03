# OCEG Capability Model Assessment

This document evaluates TrustScaffold against the OCEG capability model so the team can answer two practical questions:

1. How much would TrustScaffold materially help an organization build a defensible GRC program?
2. Where are the largest product gaps if TrustScaffold wants to mature beyond policy generation into a broader operating system for governance, risk, and compliance?

The OCEG model is organized into four capability areas:

- Learn
- Align
- Perform
- Review

The model is cyclical rather than hierarchical: Learn informs Align, Align drives Perform, Perform produces artifacts and outcomes for Review, and Review feeds back into Learn.

## Executive Summary

TrustScaffold is already strongest in `Perform` and `Review`.

The product helps organizations turn fragmented compliance work into structured execution: scoped intake, mapped policy generation, immutable document lifecycle, evidence ingestion, auditor-facing output, and role-gated review flows. That is meaningful value for early and mid-maturity teams that know they need compliance discipline but do not yet have a mature operating model.

The current major gap is that TrustScaffold still acts more like a compliance execution and evidence platform than a full GRC capability system. It helps teams do the work once the target posture is chosen, but it is lighter on continuous organizational learning, decision alignment, risk appetite translation, and management operating cadence.

## Capability Heatmap

| OCEG Area | Current Strength | Why |
|---|---:|---|
| Learn | 2.5 / 5 | Good guided intake and educational prompts, but limited continuous enablement, benchmarking, and maturity coaching |
| Align | 3 / 5 | Strong control mapping and framework selection, but weaker business-risk alignment and executive decision framing |
| Perform | 4.5 / 5 | Core strength: workflow capture, template generation, evidence ingestion, GitOps, and operational compliance execution |
| Review | 3 / 5 | Strong audit trail, approvals, auditor portal, and change visibility, but still limited management analytics, review operations, and outcome measurement |

## 1. Learn

`Learn` is about helping an organization understand obligations, terminology, maturity, dependencies, and the practical meaning of its control responsibilities.

### Where TrustScaffold Already Helps

- The wizard reduces ambiguity by translating infrastructure and scope choices into concrete policy and control consequences.
- The glossary, educational copy, decision traces, and warning callouts reduce basic compliance confusion.
- The `Show Me How` patterns make some control expectations operational rather than abstract.
- The teaching fork direction (`trustscaffold-edu`) is a strong platform asset for deeper learning workflows.

### Current Gaps

- No maturity baseline that tells a team where they stand relative to a target framework or audit goal.
- No role-specific learning tracks for founders, engineering managers, IT, security, HR, or finance stakeholders.
- No benchmarking or peer comparison layer to contextualize whether a team is ahead, behind, or under-scoped.
- No built-in “why this matters” narrative tied to risk, customer expectations, or audit outcomes.
- Limited continuous learning after initial setup; education is concentrated in the wizard instead of throughout the operating lifecycle.

### Best Next Moves

- Add a capability baseline report at the end of the wizard: current state, target state, and top readiness gaps by domain.
- Introduce persona-specific guidance panels for founders, admins, reviewers, and auditors.
- Add “why this question exists” and “what auditors infer from this answer” throughout review surfaces, not just intake.
- Use `trustscaffold-edu` content as a reusable learning layer inside the production app.

## 2. Align

`Align` is about connecting governance, risk, and compliance work to business objectives, ownership, risk appetite, and management priorities.

### Where TrustScaffold Already Helps

- Framework selection and criteria mapping give the product a clear structural backbone.
- The control graph and expected template selection translate user answers into concrete scope and artifact consequences.
- Role-gated approvals and Git-based publication create some alignment between compliance output and organizational accountability.
- The product already models sub-service organizations, scope boundaries, PHI/CDE concerns, and SOX applicability, which are key alignment levers.

### Current Gaps

- Weak explicit tie between control choices and business objectives such as customer trust, sales enablement, operational resilience, or regulated growth.
- No first-class risk appetite model that drives policy posture, evidence expectations, or approval thresholds.
- No executive-facing view that translates compliance state into business impact and funding priorities.
- No formal ownership model for control objectives, remediation items, or cross-functional decision records.
- The generation layer already reuses one answer set across multiple frameworks, but there is no strong management view that makes that reuse visible as a first-class “control once, satisfy many” capability.

### Best Next Moves

- Add an executive alignment dashboard: audit goal, business drivers, regulated data footprint, and top program risks.
- Add control owner, reviewer, and business owner assignments for major domains and generated artifacts.
- Build a reusable cross-framework control coverage view that shows reuse across SOC 2, HIPAA, PCI DSS, ISO 27001, and internal requirements.
- Add decision records for major scoping choices such as carve-outs, sub-service treatment, and assurance reliance.

## 3. Perform

`Perform` is about executing the program consistently: operating controls, producing evidence, managing artifacts, and moving work through repeatable workflows.

### Where TrustScaffold Already Helps

- This is the clearest product strength today.
- The wizard collects structured inputs across company profile, scope, governance, security tooling, and operations.
- The template system generates mapped documentation rather than forcing blank-page authoring.
- The immutable document lifecycle, approvals, and hash-chained audit logs support disciplined execution.
- Evidence ingestion creates a path away from screenshot theater and toward telemetry-backed controls.
- GitHub and Azure DevOps export flows help teams integrate compliance work into actual engineering operations.
- The auditor portal and generated review surfaces reduce ad hoc coordination overhead once the program is underway.

### Current Gaps

- Limited remediation workflow once a gap is identified. TrustScaffold surfaces the gap but does not yet fully manage closure.
- No recurring operating calendar for access reviews, risk reviews, vendor reviews, training cycles, or control testing cadence.
- No policy exception workflow with explicit approvals, expiry, and compensating controls.
- No task orchestration for evidence collection across teams and systems.
- Diagram generation and artifact dependency management are designed but still incomplete relative to the product vision.

### Best Next Moves

- Add recurring task schedules for major control operations: access reviews, vendor reviews, tabletop exercises, risk reviews, and training attestations.
- Introduce remediation plans with owner, due date, risk impact, and linked evidence requirements.
- Build exception management for temporary control deviations.
- Complete the diagram/artifact generation roadmap so system context becomes a first-class output alongside policies.

## 4. Review

`Review` is about proving effectiveness, measuring outcomes, validating decisions, and improving the program over time.

### Where TrustScaffold Already Helps

- The audit trail and revision model create strong forensic value.
- The auditor portal, provenance timeline, and snapshot logic are directly aligned to review and assurance needs.
- The audit report view and control map move the product beyond simple document generation.
- Role-gated approvals and attestations establish meaningful review checkpoints.
- Git merge visibility and immutable revision history help teams show whether changes were reviewed and when.

### Current Gaps

- Limited management review metrics: no program scorecards for overdue actions, evidence freshness, review cadence adherence, or control health trends.
- Limited feedback loop from reviews back into program learning and prioritization.
- No built-in internal audit workflow or sampled control testing management.
- No structured “review outcome” taxonomy such as accepted, remediated, deferred, exception-approved, or needs executive escalation.
- No board- or leadership-ready reporting pack that summarizes program condition over time.

### Best Next Moves

- Add a compliance operations scorecard with evidence freshness, unresolved findings, stale docs, and overdue review cycles.
- Add internal review campaigns for quarterly access review, vendor review, risk register review, and tabletop readiness.
- Add management review summaries that roll up changes, findings, exceptions, and upcoming deadlines.
- Add review outcome classification and trend tracking so the system shows whether the program is improving, stalled, or accumulating debt.

## How Much TrustScaffold Helps Today

### Strong Fit

- Startups preparing for a first SOC 2 Type I or Type II effort.
- Small and mid-sized teams that need a structured compliance operating baseline without buying a large enterprise GRC suite.
- Engineering-led organizations that want compliance artifacts and reviews to live closer to version-controlled workflows.
- Teams that already know their target frameworks and need execution discipline more than abstract consulting.

### Partial Fit

- Organizations with a working compliance baseline that need stronger cross-functional governance, board reporting, and continuous risk-program management.
- Companies handling multiple frameworks simultaneously that need a unified management system, not just a document and evidence engine.

### Weak Fit Today

- Mature enterprise GRC programs expecting enterprise risk management, policy exception governance, issue management, attestation campaigns, and leadership scorecards out of the box.

## Major Product Gaps, Ranked

1. `Alignment layer`: stronger executive, business-risk, and ownership modeling.
2. `Remediation workflow`: issue closure, due dates, task orchestration, and exception handling.
3. `Management review system`: scorecards, cadence tracking, and trend reporting.
4. `Continuous learning system`: maturity baselines, persona coaching, and embedded enablement.
5. `Artifact completeness`: diagram generation, dependency-aware artifacts, and richer reviewer packs.

## Recommended Roadmap Through the OCEG Lens

This roadmap intentionally follows an execution-first order rather than the conceptual Learn → Align → Perform → Review cycle. That is a product strategy choice: the target TrustScaffold user usually needs operational compliance discipline before they need a more sophisticated governance and management layer.

### Phase 1: Strengthen the Current Core

- Finish artifact and diagram generation.
- Add recurring review cadences and remediation tracking.
- Add evidence freshness and stale-review scorecards.

### Phase 2: Build the Alignment Layer

- Add business-driver and audit-goal framing at onboarding.
- Add owner assignments, decision records, and risk appetite inputs.
- Add multi-framework reuse and control overlap views.

### Phase 3: Build the Learning Layer

- Merge educational guidance from `trustscaffold-edu` into the production workflow.
- Add maturity baselines, readiness explanations, and role-specific coaching.
- Add scenario-driven recommendations tied to common operating models.

### Phase 4: Build the Management Review Layer

- Add executive and board-friendly reporting.
- Add structured internal review campaigns and outcome classification.
- Add trend views that show whether the program is improving across quarters.

## Bottom Line

TrustScaffold already offers meaningful capability in the OCEG `Perform` and `Review` layers, which makes it genuinely useful for organizations trying to stand up a defensible compliance operating model without starting from blank files and ad hoc evidence collection.

The biggest opportunity is to grow from a strong compliance execution platform into a broader GRC capability system by investing in the weaker `Learn` and `Align` layers. If the next product cycles focus on maturity baselines, ownership and risk alignment, remediation workflows, and management review reporting, TrustScaffold can move from “excellent compliance scaffolding” to “credible operating system for compliance program management.”
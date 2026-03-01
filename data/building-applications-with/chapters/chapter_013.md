# Chapter 13. Human-Agent Collaboration

As agentic systems weave into our workflows, success depends as much on how they
collaborate with humans on raw capabilities. This chapter brings together the
interaction-level mechanics (interfaces, uncertainty signals, handoffs) and the
governance structures (oversight, compliance, trust calibration) that turn
opaque assistants into dependable teammates.

Effective collaboration depends on calibrating autonomy: knowing when an agent
should act on its own, when it should ask a question, and when it should defer
entirely to a person. We’ll walk through strategies for progressive
delegation—starting with simple drafts or suggestions and building toward
greater independence as trust grows—and we’ll highlight how to repair that trust
if mistakes happen.

# Roles and Autonomy

This section explains how agentic systems shift from human-guided execution to
autonomous operation—and how human roles evolve to match. As agent systems gain
autonomy, one of the most important questions becomes: what role should the
human play? The answer is not static. It shifts based on the task, the stakes,
and—most critically—the level of trust between human and agent. This section
explores how those roles evolve over time, how organizations can design for
progressive delegation, and what it takes to align people, processes, and
expectations as agents become more capable collaborators. We begin by tracing
the arc from executor to governor, then examine the organizational dynamics that
shape adoption and engagement.

## The Changing Role of Humans in Agent Systems

As agent systems scale and mature within organizations, the role of the human
collaborator evolves just as much as the technology itself. In early
deployments, humans tend to act as executors, manually initiating agent tasks
and closely supervising their outputs. Over time, as systems prove their
reliability and establish trust, human roles shift toward reviewers—overseeing
decisions at key checkpoints, particularly for high-stakes or regulated domains.
This shift can be understood as a progression through four roles—executor,
reviewer, collaborator, and governor. Each marks a shift in both the agent’s
autonomy and the human’s responsibility.
[Figure 13-1](#chapter_13_figure_1_1754586819316476) visualizes this arc,
highlighting how the human role transforms alongside increasing system
capability. The figure summarizes these roles and the interface needs associated
with each.

![](/api/v2/epubs/urn:orm:book:9781098176495/files/assets/bawa_1301.png)

###### Figure 13-1. The evolving roles of humans in agent systems where, as agents grow in autonomy, humans shift from hands-on executors to high-level governors.

Eventually, in mature workflows, humans become collaborators, sharing context,
guiding priorities, and refining outputs alongside the agent in real time. The
agent may draft, act, or even decide autonomously, but the human sets the
high-level goals and intervenes when nuance, exception-handling, or moral
judgment is required. In the most advanced deployments, humans transition into
governors—defining policy boundaries, auditing systemic behavior, and overseeing
how agent systems interact across teams and functions. We can see these
responsibilities clearly in [Table 13-1](#chapter_13_table_1_1754586819318849).

Table 13-1. Roles, responsibilities, and interface needs in human-agent collaboration

| Role | Human responsibilities | Agent autonomy | Interface needs |
| --- | --- | --- | --- |
| Executor | Uploads tasks, reviews every output | Minimal—when supervised | Step‑by‑step guidance, tight feedback loops |
| Reviewer | Spot‑checks key outputs | Moderate—handles routine work | Dashboards, exception flags, confidence scores |
| Collaborator | Guides priorities, annotates jointly | High—drafts, executes with oversight | Shared planning UI, contextual annotation |
| Governor | Sets policy, audits decisions, oversees escalation | Autonomy within governance rules | Policy config screens, audit logs, explainability tools |

At [JPMorganChase](https://oreil.ly/XfBj1), for example, the internal COiN
(Contract Intelligence) platform began with junior legal staff as executors,
uploading contracts and reviewing every clause extracted by the system. As
COiN’s clause-extraction accuracy surpassed enterprise thresholds, experienced
lawyers transitioned into reviewer roles, focusing only on nonstandard or
edge-case documents. Senior counsels now serve as governors, defining extraction
policies, auditing system behavior, and steering COiN’s expansion into new
contract types. This structured delegation—from manual execution to policy
governance—offers a clear example of how human roles evolve alongside autonomy.

Similarly, GitLab’s Security Bot began life in a classic executor mode—scanning
merge requests with static analysis tools like static application security
testing (SAST) and dynamic application security testing (DAST) and flagging
potential vulnerabilities for engineers to manually address. Cases exceeding
risk thresholds automatically escalate to designated security champions, who
review and triage the bot’s findings. Their feedback is used to refine rules and
lower false positives, gradually shifting the bot toward higher autonomy while
maintaining human-in-the-loop oversight. Senior security leaders periodically
audit both rules and escalation logs, performing the governor role to ensure
escalation thresholds align with risk policy and compliance needs. This system
illustrates how executor → reviewer → governor roles can coexist and flex as
trust matures.

Each of these stages calls for different interface patterns and decision-making
tools. Executors need clear instructions and tight feedback loops; reviewers
require dashboards for exception management and audit visibility. Collaborators
need interfaces for joint task planning and contextual annotation. Governors, by
contrast, need system-wide observability, policy configuration, escalation logs,
and tooling to validate alignment with compliance frameworks and human values.

Designing for human-agent collaboration means planning not only for the
interactions of today, but also for the roles users—and their organizations—will
grow into tomorrow.

## Aligning Stakeholders and Driving Adoption

Even the most capable agentic systems can fail if they are not embraced by the
people and teams they are designed to support. Too often, agents are introduced
as technical upgrades but perceived as novelties or distractions—leading to poor
adoption, passive resistance, or active workarounds. To avoid this,
implementation must be as much a human change management effort as it is a
software deployment.

Successful adoption begins with clear stakeholder alignment. Different teams may
have very different expectations: engineers may focus on efficiency, legal teams
on compliance, and end users on ease of use. If these expectations are not
surfaced and harmonized early, agents risk being built for an imaginary
“average” user who doesn’t exist. Misalignment breeds disillusionment.

The first step is to involve stakeholders early in the design process—not just
as testers, but as co-creators. This includes defining clear goals: what
specific outcomes should the agent improve? What decisions should it take on,
and which should remain human-led? What would success—and failure—look like?

Crucially, success metrics must go beyond technical performance. An agent that
completes tasks quickly but undermines trust or adds friction will not be
adopted. Stakeholder buy-in depends on perceived usefulness, reliability, and
alignment with existing workflows and values.

Implementing agentic systems is also an opportunity for broader organizational
learning. When expectations diverge—between users and developers, or between
what the agent can do and what stakeholders believe it should do—those moments
can be used to clarify priorities, refine requirements, and recalibrate roles.
Friction, if handled transparently, becomes fuel for iteration.

To support ongoing adoption, organizations should invest in training, feedback
loops, and responsive support. Just as agents evolve, so should their onboarding
materials and integration guides. Teams need spaces to voice concerns, propose
improvements, and celebrate small wins as the agent grows into its role.

For example, [ZoomInfo’s four-phase rollout of GitHub
Copilot](https://oreil.ly/c-ybd) began with a small pilot of 50 engineers and
only expanded to its full team of more than 400+ people once metrics (a 33%
suggestion acceptance rate and 72% developer satisfaction) met carefully
established thresholds—and qualitative feedback confirmed that Copilot
suggestions were genuinely helpful. By tying each expansion to concrete trust
signals, ZoomInfo transformed Copilot from a nice-to-have into a core
productivity tool.

Ultimately, adoption is not a binary switch—it’s a journey of coevolution
between humans and their agent teammates. Systems that succeed are those where
stakeholders don’t just use the agent—they believe in its value and see it as an
extension of their goals.

Bridging this gap is not optional. It’s the difference between agentic systems
that quietly fade and those that truly transform how work gets done. With human
roles defined and adoption strategies in place, we now turn to how collaboration
itself scales—moving from individual assistants to team-wide and
enterprise-level agents.

# Scaling Collaboration

In this section, we examine how agents expand from individual assistants to team
and enterprise collaborators—and what each stage demands of human and system
design. As organizations adopt agents more broadly, their roles evolve from
isolated assistants to collaborative participants embedded across teams,
departments, and strategic workflows. Understanding how agent responsibilities
scale—from personal tools to organizational infrastructure—is essential for
designing effective collaboration models, access controls, and governance
structures.

At the smallest scope, agents serve individuals: helping manage calendars,
summarize emails, or provide research support. These agents benefit from
intimate context but have limited authority and minimal risk. Their success
depends on understanding the preferences and working styles of a single user.
Over time, individuals often delegate more responsibility to these agents, but
oversight remains straightforward.

Team agents represent the next layer of complexity. They assist with shared
knowledge management, project tracking, or meeting synthesis. These agents must
navigate shared memory boundaries, respect interpersonal dynamics, and mediate
across potentially conflicting expectations. They require more sophisticated
context management and must surface uncertainties that might require group
decision making rather than unilateral action.

We see this in Bank of America’s “Erica” assistant, which today handles over two
billion customer requests and more than half of internal IT-help-desk tickets;
by surfacing its confidence (e.g., “I’m 85% sure this answers your question”)
and providing a clear handoff to a live agent whenever uncertainty rose above a
defined threshold, Erica scaled from simple FAQs to trusted enterprise-wide
service.

As we scale to division- or function-level agents—such as agents supporting
finance, legal, or customer success—responsibilities expand dramatically. These
agents interact with sensitive systems, touch multiple stakeholders, and
influence performance at scale.

At this level, role-based access control (RBAC) becomes crucial. Agents must
differentiate between public, internal, and restricted knowledge. They should
have different privileges when acting on behalf of a VP than when assisting an
intern. Clear delegation frameworks and logging are essential to ensure
accountability.

At the highest level, enterprise-wide agents may coordinate workflows across
departments, synthesize cross-functional data, or even advise on strategic
decisions. These agents must operate within strong governance boundaries,
subject to strict policies, regular audits, and often human sign-off for
critical actions. They must be aware of inter-team dependencies, business rules,
and organizational politics.

Critically, the design of these agents is not just a technical challenge—it’s a
sociotechnical one. Agents must align with organizational culture, incentives,
and workflows. Collaboration interfaces must make it easy for humans to review,
approve, or modify agent outputs. Escalation pathways must scale with
responsibility. And as agents span wider scopes, the cost of errors—and the need
for well-defined trust boundaries—increases.

By recognizing the different scopes at which agents operate and designing
accordingly, organizations can safely and effectively unlock their full
potential—from individual productivity to systemic transformation.

## Agent Scope and Organizational Roles

Not all agents are created equal—or rather, not all are created to serve the
same *entity*. As organizations scale their use of agentic systems, they
naturally adopt agents that operate at different levels of abstraction and
authority. Understanding and intentionally designing around these scopes is
critical for safe, effective deployment. Agent deployments typically fall into
one of five scopes, as shown in
[Table 13-2](#chapter_13_table_2_1754586819318860). As agents scale from
personal assistants to organizational systems, their access scope, decision
autonomy, and stakeholder impact increase. Each scope requires tailored design
choices for permissions, oversight, and context management.

Table 13-2. Agent scopes across organizational levels

| Scope | Primary user(s) | Access scope | Decision autonomy | Examples |
| --- | --- | --- | --- | --- |
| Personal | Individual | Email, calendar, documents, code | Low to moderate | Executive assistant, dev copilot |
| Team | Group or manager | Shared drives, meetings, goals | Moderate | Sprint planning assistant, meeting bot |
| Project | Cross-functional group | Task tracking, deliverables | Moderate to high | R&D program agent, launch coordination bot |
| Functional | Department | Customer relationship management, human resource information services, financial systems | High (within domain) | HR agent, compliance agent, marketing agent |
| Organizational | Leadership/IT/chief information officer | Enterprise systems, analytics | High or restricted | Company-wide analytics agent, AI help desk |

Each scope comes with different requirements for autonomy, oversight, data
access, and trust calibration. For example, a personal agent can take small
risks with limited scope, while an organizational agent must operate with
rigorous guardrails, explainability, and auditing.

The first and most critical implication is the need for differentiated access
control. As agents expand in scope, they must adhere to increasingly strict
role-based access controls (RBAC) that align with their responsibilities and the
sensitivity of the data they touch.

Personal agents may inherit permissions from the individual they assist, while
functional or organizational agents require explicit privileges that reflect
their designated role within enterprise systems. Designing this access
architecture demands coordination between IT, data governance teams, and agent
developers to ensure that agents never exceed their intended scope.

These varying scopes also demand differentiated policies. Organizations should
not apply a one-size-fits-all approach to autonomy, escalation, or logging. For
instance, a personal agent might be permitted to send emails or schedule
meetings autonomously, whereas a functional agent in finance may be required to
route every action through a human-in-the-loop approval.

Organizational agents—those operating with the widest access—may require
multiple layers of authorization or an internal governance board to review and
approve behaviors and system updates. As agent scope increases from personal to
organizational, both the autonomy level and associated risk rise. As is shown in
[Table 13-3](#chapter_13_table_3_1754586819318869), this progression demands
increasingly robust governance—moving from lightweight user controls to
enterprise-wide compliance, auditing, and oversight mechanisms.

Table 13-3. Agent scope and risk

| Scope | Autonomy level | Risk profile | Governance needs |
| --- | --- | --- | --- |
| Personal | Low to moderate | Low | User-managed preferences; minimal oversight; explainability optional |
| Team | Moderate | Moderate | Shared memory boundaries; peer-level escalation; trust calibration needed |
| Project | Moderate to high | Moderate to high | Cross-functional visibility; logging; conflict resolution mechanisms |
| Functional | High (domain-bounded) | High | RBAC; audit logs; compliance alignment |
| Organizational | High or restricted | Very high (system-wide) | Multitier sign-off; governance board review; ongoing ethical audits and traceability |

Ultimately, defining agent scope is not just a technical architecture
decision—it is a governance one. As agents become more essential to
organizational workflows, their scope determines not only what they *can* do,
but what they *should* do, and under whose watch. In the next section, we turn
to the closely related question of how memory and context should be managed
across these different scopes, and the trust, privacy, and continuity
implications that arise when agents begin to remember not just for
individuals—but for teams, departments, and the organization as a whole.

## Shared Memory and Context Boundaries

As agents expand beyond individual use to support teams and organizations, how
they manage memory becomes a critical design concern. Memory enables agents to
personalize experiences, maintain context across sessions, and improve over
time—but at larger scopes, it also introduces serious risks around privacy,
misuse, and governance. Agents should never assume access to personal or
sensitive data across scopes without clear policy. Designing memory systems that
respect these privacy boundaries—and make them auditable and enforceable—is key
to ethical scalability.

Personal agents often store simple, user-specific context: preferences, past
queries, in-progress tasks. But a team or departmental agent may need access to
shared goals, conversations, or documents, and an org-level agent might build
long-term memory of patterns across the business.

These broader memories are powerful—but also more sensitive. If a team agent
recalls something shared in a private one-to-one chat, or a department agent
surfaces confidential data across business units, the result could be a serious
breach of trust or compliance.

To avoid this, memory must be scoped appropriately. Personal agents should
default to isolated memory, only sharing data when explicitly allowed. Team and
department agents should operate within shared but access-controlled memory
spaces. Org-wide agents should work within policy-governed systems that enforce
retention rules, logging, and auditability. In all cases, agents should be able
to explain what they remember and why—and users should be able to inspect or
delete that memory when needed.

Designers must also consider context flow. Should memory move upward (e.g., from
a personal agent to a project agent)? Can agents query one another for context,
or must they stay siloed? Clear boundaries are essential to prevent
unintentional leaks or scope creep.

Just as important is making memory behavior transparent. Users should know what
their agent remembers and be able to control it. That means surfacing memory
visibly in the interface, giving people the ability to turn it off, and ensuring
agents never make hidden assumptions based on stale or private data.

Ultimately, memory isn’t just a technical feature—it’s a source of power, trust,
and risk. As agents operate at broader levels, we must treat memory as an asset
that requires explicit governance, not an afterthought bolted onto stateful
systems. Systems that manage memory well will feel coherent, helpful, and
respectful. Systems that don’t will feel invasive, opaque, and unsafe.

As you’ve seen, designing agents for scopes from personal assistants to
enterprise-wide orchestrators requires tailoring autonomy, access controls, and
interface patterns at each level. But remember: this is not a one-and-done
exercise. Effective collaboration at scale is part of the same evolving journey
we introduced at the start of this chapter—where human roles shift, trust
deepens, and governance adapts alongside capability. Every new scope you
unlock—from a project bot to a division-level adviser—is another step along that
arc of progressive delegation. With these patterns in hand, we’re ready to
address the critical foundations of trust, governance, and compliance that
underpin safe, ethical collaboration at every level.

# Trust, Governance, and Compliance

Here we explore how to build and maintain trust, accountability, and oversight
as agent autonomy grows—ensuring collaboration remains safe and aligned. As
agents take on more critical roles in our workflows, trust and accountability
become not just desirable—but essential. Technical performance alone is not
enough. For agents to be effective partners, they must behave transparently,
respect boundaries, and operate within well-defined governance frameworks. This
section explores the foundations of trustworthy systems: how trust is built and
calibrated over time, how responsibility and accountability are enforced, and
how oversight and compliance mechanisms ensure agents act safely, ethically, and
legally. From progressive delegation and auditing to escalation design and
regulatory alignment, we examine what it takes to move from functional utility
to dependable partnership.

## The Lifecycle of Trust

Trust is not a binary state—it evolves. Users and employees don’t instantly
trust agents just because they’re well designed or technically capable. Instead,
trust is built gradually through consistent performance, transparent behavior,
and clear boundaries. It can deepen with time—or erode quickly when an agent
oversteps, fails silently, or behaves unpredictably.

A cautionary example is [Klarna’s 2024 decision](https://oreil.ly/DfI-F) to
replace roughly 700 customer-service roles with an AI chatbot: once empathy and
nuanced judgment vanished, complaint volumes surged, forcing Klarna to rehire
human agents by mid-2025 and underscoring that over-automation without robust
human fallback can swiftly undermine trust.

Transparency plays a key role in trust calibration. Agents should proactively
disclose their confidence levels, decision factors, and whether uncertainty was
involved. Interfaces should make it clear *why* the agent behaved a certain
way—not just *what* it did. At the personal level, trust grows as users see
their agent remember preferences, follow instructions, and recover gracefully
from mistakes. But at larger scopes—team, function, or organizational—trust
becomes more complex. Now the agent represents not just one person, but a shared
interest. Its actions may impact multiple users, trigger system-wide effects, or
be interpreted as reflecting company policy. In these contexts, trust must be
more deliberate and more distributed.

One key pattern is progressive delegation. Early in an agent’s lifecycle, it
should act cautiously, deferring to humans for review or approval. As it proves
reliable—and as users gain familiarity—its autonomy can expand. For example, a
team agent might start by drafting status reports and eventually be trusted to
send them. A finance agent might begin with read-only access and later be
allowed to submit transactions under supervision. Designing systems that support
this staged growth of trust is essential for safe, scalable adoption.

To support that growth, agents should make trustworthiness visible. That means
clear versioning, change logs, and audit trails. It means surfacing uncertainty,
not hiding it. And it means giving users ways to override, intervene, or correct
agent behavior without friction.

Organizations also need mechanisms for trust repair. When agents make
mistakes—or when expectations shift—there should be a way to reset behavior,
retrain, or restrict capabilities. Without a recovery path, even minor missteps
can lead to lasting damage in confidence.

Ultimately, trust in agents mirrors trust in people: it must be earned,
maintained, and rebuilt when broken. Designing for the lifecycle of trust—rather
than treating it as a given—is one of the most important governance
responsibilities for any system that seeks to integrate agents into meaningful
human workflows. Yet trust alone is not enough. For agentic systems to truly
transform work, they must be embraced—not merely tolerated—by the people they’re
intended to support. That leap from reliability to real-world impact happens in
the hands of users, teams, and leaders. But even strong trust must be anchored
in systems of accountability. Trust may guide daily interactions, but governance
must answer: what happens when things go wrong?

## Accountability Frameworks

Accountability is critical for ethical agent design, ensuring that clear lines
of responsibility exist for an agent’s actions, decisions, and consequences.
Without accountability, failures—whether technical, ethical, or operational—can
easily go unaddressed, eroding trust and leaving users or stakeholders without
recourse. Establishing accountability requires both structural measures, such as
oversight policies and escalation pathways, and technical measures, such as
logging, traceability, and ethical audits.

Effective accountability frameworks ensure that failures are detected, analyzed,
and addressed systematically, rather than being dismissed as unintended side
effects of complex systems. These frameworks also define who is ultimately
responsible—be it developers, system operators, or deploying organizations—when
agent systems cause harm or make incorrect decisions.

To make accountability tangible, teams can adopt or adapt established
frameworks—rather than inventing processes from scratch. Here are two readily
available templates and resources:

* NIST AI Risk Management Framework (AI RMF)

  + A voluntary, risk‐based approach published by the National Institute of
    Standards and Technology (NIST) that spans four core functions: govern, map,
    measure, and manage.
  + Practitioners can download the AI RMF profiles and worksheets from NIST to map
    their own system’s risk levels, record mitigation strategies, and track progress
    over time.
* Co‑designed AI Impact Assessment Template

  + Developed with input from AI practitioners and compliance experts, this template
    aligns with the EU AI Act, NIST AI RMF, and ISO 42001.
  + It guides teams through documenting system purpose, stakeholder impacts, bias
    and fairness checks, and mitigation plans—usable both pre‑deployment and for
    ongoing governance.

Auditing plays a key role in maintaining accountability by offering structured
assessments of agent behavior, system outputs, and decision pathways. Similarly,
robust logging and traceability mechanisms ensure that every action an agent
takes can be tracked, reviewed, and, if necessary, reversed or corrected.

Ethical audits are structured evaluations designed to identify ethical risks,
unintended consequences, and potential harm arising from agent behavior. These
audits go beyond technical testing to focus on the social, cultural, and
organizational impacts of agent systems. Fairness must be treated as a
first-class audit objective, not an afterthought. Audits should include checks
for disparate impacts across demographic groups, feedback loops that might
amplify bias, and the unintended consequences of optimizing only for accuracy or
efficiency. An effective ethical audit typically involves:

Evaluation of outputs
:   Assessing whether an agent’s actions align with its intended goals and ethical
    guidelines

Bias and fairness checks
:   Identifying patterns of bias or unfair treatment in agent outputs

Decision pathway analysis
:   Reviewing how the agent arrives at its recommendations or decisions

Stakeholder impact assessments
:   Considering how the agent’s behavior affects different user groups or
    stakeholders

Behavioral assessments complement audits by observing how agents perform in
real-world scenarios, especially under edge cases or ambiguous inputs. These
assessments can identify unintended behaviors, such as agents making ethically
questionable trade-offs or responding unpredictably to certain prompts.

Ethical audits and behavioral assessments should not be one-off activities—they
must be ongoing, iterative processes. Agents evolve through updates, retraining,
and exposure to new data, and their behavior must be reassessed regularly to
ensure ongoing alignment with ethical standards.

Incorporating independent third-party audits can also add an additional layer of
transparency and credibility. External experts can identify blind spots or risks
that internal teams might overlook due to familiarity with the system.

Effective accountability relies on comprehensive logging and traceability
systems that capture an agent’s decisions, actions, and contextual reasoning in
detail. Logging serves as a recordkeeping mechanism, ensuring that every
significant interaction or output is documented and can be reviewed later if
needed. Well-implemented logging systems should include:

Decision logs
:   Records of why the agent made specific decisions, including inputs, intermediate
    reasoning steps, and outputs

User interaction logs
:   Details of user inputs and agent responses, with timestamps for clarity

Error and failure logs
:   Documentation of when and why an agent failed to complete a task or produced an
    unintended output

Traceability takes logging a step further by enabling auditors or developers to
reconstruct an agent’s behavior in specific scenarios. This helps answer
questions like the following:

* Why did the agent recommend this outcome?
* What data influenced this decision?
* Were there external factors (e.g., API failures, conflicting instructions) that
  impacted the result?

Traceability is especially crucial in high-stakes domains like healthcare,
finance, or criminal justice, where the consequences of incorrect agent behavior
can be severe.

Additionally, logs must be protected and managed responsibly. Unauthorized
access to logs containing sensitive user data can introduce privacy risks.
Encryption, access controls, and data anonymization are essential safeguards for
preventing misuse or breaches.

Logging systems must also be designed with clarity and usability in mind. It’s
not enough for logs to exist—they must be interpretable by developers, auditors,
and stakeholders. Clear documentation and visualization tools can help make
traceability insights actionable.

## Escalation Design and Oversight

Accountability doesn’t end with logs and audits—it must be backed by clear
escalation mechanisms and human oversight structures that activate when agents
encounter uncertainty, ambiguity, or ethical risk. As agents operate with
increasing autonomy, organizations must answer a critical question: when—and
how—should a human get involved?

Escalation design is the policy and infrastructure layer that ensures agents
don’t act beyond their authority, especially in high-stakes or ambiguous
situations. A well-designed escalation framework defines clear thresholds for
human intervention: specific decision types, risk levels, or confidence
boundaries that require oversight. For example, a customer support agent might
handle routine inquiries autonomously, escalate billing disputes to a human
supervisor, and flag potential abuse cases to a trust and safety officer.
Similarly, a procurement agent might be allowed to auto-approve purchases under
$1,000 but require multiparty sign-off above that threshold.

These pathways must be encoded in both technical systems and organizational
roles. Agents should be able to recognize when escalation is required—based on
uncertainty, conflicting constraints, or explicit policies—and route tasks
accordingly. Just as importantly, humans on the receiving end of escalations
need context: what the agent attempted, why it escalated, and what information
is needed to proceed.

Oversight isn’t just reactive. In well-governed systems, designated individuals
or committees proactively monitor agent behavior, review logs, and refine
escalation policies over time. These oversight roles may mirror existing
structures—e.g., line managers, compliance leads—or they may require new
positions such as AI operations analysts or agent governance officers. Oversight
isn’t just about human-in-the-loop pathways; it includes the *guardrails*—both
policy and technical—that constrain agents to operate safely even in autonomous
modes.

Escalation design also plays a key role in trust calibration. When users know
that agents will defer at the right moments—and that humans can step in—they are
more likely to rely on the system without over-trusting it. In contrast, systems
without clear escalation logic tend to either frustrate users with false
confidence or become paralyzed by uncertainty.

Finally, effective escalation design should support feedback loops. When humans
resolve escalated cases, their decisions can be used to improve future agent
behavior—whether through updated policies, retraining, or prompt tuning.
Escalation isn’t a sign of failure; it’s a critical part of responsible
autonomy.

In the next section, we’ll examine how agents scale across organizational
scopes—and how oversight must evolve to match the complexity and risk of each
context.

## Privacy and Regulatory Compliance

As agent systems become integral to critical workflows across industries, they
are increasingly subject to legal and regulatory scrutiny. Governments and
international bodies are introducing AI-specific regulations to ensure these
systems are deployed safely, ethically, and transparently. From data privacy
laws to sector-specific compliance requirements, organizations building and
deploying agents must navigate a complex and evolving regulatory landscape to
mitigate legal risks and maintain public trust.

Compliance is not just about avoiding penalties. It’s about embedding ethical
principles—such as fairness, transparency, accountability, and privacy—into the
fabric of agent design and deployment. When implemented thoughtfully, compliance
can serve as a foundation for more resilient, adaptable, and trustworthy
systems. While regulatory requirements vary by region and industry, common
themes emerge. Some of the most influential frameworks include:

The EU AI Act
:   A risk-based framework categorizing AI systems into levels of risk (e.g.,
    minimal risk, high risk, unacceptable risk) with corresponding obligations for
    transparency, accountability, and human oversight.

GDPR (General Data Protection Regulation)
:   A cornerstone of global data privacy, requiring organizations to minimize data
    collection, ensure user consent, and provide clear pathways for data deletion
    and correction.

CCPA (California Consumer Privacy Act)
:   Offering data protection and transparency rights to California residents,
    emphasizing user consent and data access rights.

HIPAA (Health Insurance Portability and Accountability Act)
:   In healthcare, agents handling patient data must comply with strict privacy and
    security requirements.

Industry-specific standards
:   Including PCI DSS (Payment Card Industry Data Security Standard) for payment
    processing and SOX (Sarbanes-Oxley) for financial reporting integrity, each of
    which imposes additional constraints on agent behavior and data access.

Regulations are evolving rapidly, and what qualifies as compliant today may fall
short tomorrow. Staying aligned requires ongoing investment in legal monitoring,
architectural flexibility, and cross-functional collaboration. To make
compliance sustainable, organizations should integrate it directly into their
development pipelines, rather than treating it as a final gate. Key strategies
include:

Automated compliance gates
:   As part of each build, run automated tests that scan for disallowed content
    (e.g., PII leakage), validate prompt testing against fairness benchmarks, and
    enforce data‑handling policies. Fail the build if any check trips.

Policy‑as‑code libraries
:   Leverage policy frameworks (e.g., Open Policy Agent) to codify your
    organization’s data‑use and privacy rules. Include policy tests alongside unit
    or integration tests, so that any policy drift is caught before deployment.

Model cards and datasheets
:   Generate a living “model card” as a build artifact—complete with lineage,
    training data statistics, known limitations, and intended use cases—and publish
    it to your internal model registry. Similarly, update a “datasheet” for each new
    training or fine‑tuning dataset, ensuring that every model version ships with a
    compliance‑ready bundle.

Many of the technical foundations of compliance align directly with best
practices for privacy and security. These include: collecting only the data
necessary for the task, stripping PII from datasets where possible, protecting
data both at rest and in transit using strong encryption protocols, and
restricting data access to only authorized users and systems.

Ensuring regulatory compliance isn’t just about meeting legal obligations—it’s
about embedding compliance into every stage of the agent lifecycle, from design
and training to deployment and long-term monitoring. This alignment requires a
combination of technical safeguards, operational policies, and cultural
commitments across the organization.

Let’s also remember that the regulatory environment is changing rapidly, and
organizations must remain agile in the face of evolving regulations. This means
tracking these changes, designing systems that can adapt quickly to new
compliance mandates, and collaborating with legal and compliance experts
throughout the agent lifecycle.

Security complements privacy, ensuring that even the data agents are allowed to
access is shielded from breach, leakage, or tampering—an especially urgent
concern as agents connect to sensitive back-office systems.

Trust, accountability, and regulatory alignment aren’t merely safety
nets—they’re active ingredients in the partnership between humans and agents. We
opened this chapter by arguing that collaboration must be designed as a journey,
not a toggle switch, and the frameworks you’ve just explored close that loop:
they give you the guardrails and recovery paths to move confidently from
cautious pilots to full-fledged partnerships. As these governance mechanisms
mature, they feed directly back into your design, keeping the cycle of adoption,
learning, and progressive autonomy rolling forward until human-agent teams
operate as seamless, trustworthy extensions of one another. We now look ahead to
the future of human-agent teams—exploring how to sustain innovation, measure
impact, and guide agentic systems toward truly human-centered outcomes.

# Conclusion: The Future of Human-Agent Teams

Agent systems represent one of the most transformative technologies of our time,
redefining how we interact with software, automate tasks, and solve complex
problems across industries. From customer support chatbots and personal
assistants to autonomous workflows and decision-making engines, agents are no
longer experimental—they are becoming essential components of our digital
infrastructure. This book has explored the multifaceted world of agent systems,
diving deep into their design, orchestration, security, UX, and ethical
considerations to provide a comprehensive guide for building effective and
responsible agentic systems.

We began by laying the foundations of agent systems, exploring their promise,
their distinctions from traditional software, and their unique strengths and
challenges. From there, we examined the core principles of agent design,
including skills, planning, memory, and learning from experience—all essential
elements that enable agents to operate autonomously, adaptively, and
effectively.

As we scaled from single-agent systems to multiagent coordination, we saw how
agents can collaborate, negotiate, and distribute tasks to achieve goals that
would be impossible for a single agent to handle alone. We also addressed the
critical importance of measurement, validation, and production monitoring,
emphasizing the need for robust evaluation frameworks and ongoing oversight to
ensure reliable performance.

The book explored the security and resilience of agent systems, recognizing that
agents can become attractive targets for malicious actors and vulnerable to
unintended failures. We examined strategies for securing foundation models,
protecting sensitive data, and mitigating external threats and internal
misconfigurations—all while balancing innovation with operational safety.

Finally, we addressed the ethical responsibilities inherent in building and
deploying agent systems. As agents wield greater influence over our lives and
decisions, the principles of oversight, transparency, accountability, fairness,
and privacy become nonnegotiable. Ethical design isn’t a feature—it’s a
fundamental requirement for ensuring that agent systems serve society
responsibly and equitably.

Agent systems are not “set and forget” technologies—they must be continuously
evaluated, improved, and aligned to evolving human needs. Agents must evolve
alongside the challenges they are built to address, adapting to new data,
emerging threats, and shifting societal expectations. The organizations that
succeed will be those that prioritize agility, transparency, and a deep
commitment to ethical principles.

At the same time, collaboration will be essential. Engineers, designers,
ethicists, policymakers, and end users must work together to ensure that agent
systems are not only powerful but also aligned with human values. The success of
agent systems isn’t measured by their technical sophistication alone—it’s
measured by their impact on individuals, organizations, and society as a whole.

As you move forward—whether as a developer, a team lead, an executive, or a
policymaker—you are part of shaping the future of agentic systems. The tools,
frameworks, and principles outlined in this book are starting points, not final
answers, and we are all learning as we continue to move the field forward.
Building agent systems is as much an organizational and cultural challenge as it
is a technical one. Whether you’re just beginning or already deploying agent
systems at scale, the path forward is iterative and collaborative. The most
effective teams don’t leap to full automation—they build trust gradually,
evaluate outcomes rigorously, and embed governance from the start. Here are four
practical principles to guide your next steps:

Experiment
:   Pilot an agent in a low-risk domain.

Measure
:   Define success metrics before you start.

Govern
:   Establish oversight and logging early.

Scale
:   Iterate on trust and autonomy thresholds.

The rise of agent systems offers an extraordinary opportunity—a chance to
amplify human potential, drive meaningful progress, and address challenges at
scales previously unimaginable. But this future isn’t inevitable—it must be
intentionally built, thoughtfully governed, and ethically guided. The choices we
make today shape the digital future we leave for tomorrow. Building agents isn’t
merely a professional obligation—it’s an opportunity to positively impact
generations to come.

Let us create agentic systems that are not only smart but wise, not only
efficient but just, and not only empowering but deeply committed to human
flourishing.

close x

![](/covers/urn:orm:book:9781098176495/200w/)

### [Building Applications with AI Agents](/library/view/building-applications-with/9781098176495/)

[Michael
Albada](https://learning.oreilly.com/search/?query=author%3A%22Michael%20Albada%22&sort=relevance&highlight=true)

Published by [O'Reilly Media, Inc.](https://learning.oreilly.com/publisher/cde70c0c-24bc-41d1-aab0-8a405063a16e)

queue

21% complete

Content Progress 21% completedApprox. 8 hours left

Collapse

ContentsHighlights

1. ##### [Preface](/library/view/building-applications-with/9781098176495/preface01.html)

   queue

   100% complete

   checkmark circle
2. ##### [1. Introduction to Agents](/library/view/building-applications-with/9781098176495/ch01.html)

   queue

   86% complete
3. ##### [2. Designing Agent Systems](/library/view/building-applications-with/9781098176495/ch02.html)

   queue

   56% complete
4. ##### [3. User Experience Design for Agentic Systems](/library/view/building-applications-with/9781098176495/ch03.html)

   queue

   100% complete

   checkmark circle
5. ##### [4. Tool Use](/library/view/building-applications-with/9781098176495/ch04.html)

   queue

   5% complete
6. ##### [5. Orchestration](/library/view/building-applications-with/9781098176495/ch05.html)

   queue

   3% complete
7. ##### [6. Knowledge and Memory](/library/view/building-applications-with/9781098176495/ch06.html)

   queue

   4% complete
8. ##### [7. Learning in Agentic Systems](/library/view/building-applications-with/9781098176495/ch07.html)

   queue

   3% complete
9. ##### [8. From One Agent to Many](/library/view/building-applications-with/9781098176495/ch08.html)

   queue

   2% complete
10. ##### [9. Validation and Measurement](/library/view/building-applications-with/9781098176495/ch09.html)

    queue
11. ##### [10. Monitoring in Production](/library/view/building-applications-with/9781098176495/ch10.html)

    queue

    4% complete
12. ##### [11. Improvement Loops](/library/view/building-applications-with/9781098176495/ch11.html)

    queue

    3% complete
13. ##### [12. Protecting Agentic Systems](/library/view/building-applications-with/9781098176495/ch12.html)

    queue

    3% complete
14. ##### [13. Human-Agent Collaboration](/library/view/building-applications-with/9781098176495/ch13.html)

    queue

    11% complete

    1. ###### [Roles and Autonomy](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_roles_and_autonomy_1754586819323727)

       Hide Items

       1. ###### [The Changing Role of Humans in Agent Systems](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_the_changing_role_of_humans_in_agent_systems_1754586819323756)
       2. ###### [Aligning Stakeholders and Driving Adoption](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_aligning_stakeholders_and_driving_adoption_1754586819323780)
    2. ###### [Scaling Collaboration](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_scaling_collaboration_1754586819323806)

       Show More Items
    3. ###### [Trust, Governance, and Compliance](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_trust_governance_and_compliance_1754586819323888)

       Show More Items
    4. ###### [Conclusion: The Future of Human-Agent Teams](/library/view/building-applications-with/9781098176495/ch13.html#chapter_13_conclusion_the_future_of_human_agent_teams_1754586819323998)
15. ##### [Glossary](/library/view/building-applications-with/9781098176495/glossary01.html)

    queue

    13% complete
16. ##### [Index](/library/view/building-applications-with/9781098176495/ix01.html)

    queue
17. ##### [About the Author](/library/view/building-applications-with/9781098176495/colophon01.html)

    queue
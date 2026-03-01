# Preface

When I first started connecting language models, tools, orchestration, and
memory together into what we now call an agent, I was surprised by how capable
this design pattern was, and just how much confusion there was about this topic.
During my time building agents and sharing my findings on incident
investigation, threat hunting, vulnerability detection, and more, I found that
this latest design pattern enabled us to solve whole new classes of problems,
but also came with many practical hurdles to making them reliable for real-world
applications. Engineers, scientists, product managers, and leadership all wanted
to know more. “How do I get my agent to work?” “I can get my agent to work some
of the time, but how do I get it to work most or all of the time?” “How do I
choose a model for my use case?” “How do I design good tools for my agent?”
“What kind of memory do I need?” “Should I use RAG?” “Should I build a
single-agent or multiagent system?” “What architecture should I use?” “Do I need
to fine-tune?” “How do I enable agents to learn from experience and improve over
time?”

While there are many blog posts and research papers that focus on specific
aspects of the topic of designing agent systems, I realized there were a lack of
accessible, holistic, trustworthy guides for this. I couldn’t find the book that
I wanted to share with my colleagues, so I set out to write it.

Through in-depth discussions, I’ve helped teams navigate the complexities of AI
agents, considering their unique goals, constraints, and environments. AI agent
systems are intricate, blending autonomy, decision making, and interaction in
ways that traditional software doesn’t. They’re data-driven, adaptive, and
involve multiple components like perception, reasoning, action, and learning,
all while interfacing with users, tools, and other agents. Complicating matters,
the foundation models that power these agents are probabilistic and stochastic
by nature, making evaluation and testing more challenging.

This book takes a comprehensive approach to building applications with AI
agents. It covers the entire lifecycle, from conceptualization to deployment and
maintenance, illustrated with real-world case studies, supported by references,
and reviewed by practitioners in the field. Sections on advanced topics—like
agent architectures, tool integration, memory systems, orchestration, multiagent
coordination, measurement, monitoring, security, and ethical considerations—are
further refined by expert input.

Writing this book has been a journey of discovery for me as well. The initial
drafts sparked conversations that challenged my views and introduced new ideas.
I hope this process continues as you read it, bringing your own insights. Feel
free to share any feedback you might have for this book via Twitter (X),
LinkedIn, my personal website, or any other channels that you can find.

# What This Book Is About

This book provides a practical framework for building robust applications using
AI agents. It addresses key challenges and offers solutions to questions such
as:

* What defines an AI agent, and when should I use one? How do agents differ from
  traditional machine learning (ML) systems?
* How do I design agent architectures for specific use cases, including scenario
  selection, and core components like tools, memory, planning, and orchestration?
* What are effective strategies for agent planning, reasoning, execution, tool
  selection, and topologies like chains, trees, and graphs?
* How can I enable agents to learn from experience through nonparametric methods,
  fine-tuning, and transfer learning?
* How do I scale from single-agent to multiagent systems, including coordination
  patterns like democratic, hierarchical, or actor-critic approaches?
* How do I evaluate and improve agent performance with metrics, testing, and
  production monitoring?
* What tools and frameworks are best for development, deployment, and securing
  agents against risks?
* How do I ensure agents are safe, ethical, and scalable, with considerations for
  user experience (UX), trust, bias, fairness, and regulatory compliance?

The content draws from established engineering principles and emerging practices
in AI agents, with case studies (such as customer support, personal assistants,
legal, advertising, and code review agents) and discussions on trade-offs to
help you tailor solutions to your needs.

# What This Book Is Not

This book isn’t an introduction to AI or ML basics. It assumes familiarity with
concepts like neural networks, natural language processing, and basic
programming in languages like Python. If you’re new to these, pointers to
resources are provided, but the focus is on applied agent building.

It’s also not a step-by-step tutorial for specific tools, as technologies evolve
rapidly. Instead, it offers guidance on evaluating and selecting tools, with
pseudocode and examples to illustrate concepts. For hands-on implementation,
online tutorials and documentation are recommended, including frameworks like
LangChain and AutoGen.

# Who This Book Is For

This book is for engineers, developers, and technical leaders aiming to build AI
agent-based applications. It’s geared toward roles like AI engineers, software
developers, ML engineers, data scientists, and product managers with a technical
bent. You might relate to scenarios like the following:

* You’re tasked with building an autonomous system for decision support, or
  interactive services.
* You have a working agent prototype and you want to harden it and get it ready
  for production.
* Your team struggles with agent reliability—handling failures, adapting to
  dynamic environments, or orchestrating complex tasks—and you want systematic
  approaches including orchestration, memory, and learning from experience.
* You’re integrating agents into existing workflows and seek best practices for
  scalability, multiagent coordination, UX design, measurement, validation,
  monitoring, and security.

You can also benefit if you’re a tool builder identifying gaps in the agent
ecosystem, a researcher exploring applications, or a job seeker preparing for AI
agent roles.

# Conventions Used in This Book

The following typographical conventions are used in this book:

*Italic*
:   Indicates new terms, URLs, email addresses, filenames, and file extensions.

`Constant width`
:   Used for program listings, as well as within paragraphs to refer to program
    elements such as variable or function names, databases, data types, environment
    variables, statements, and keywords.

**`Constant width bold`**
:   Shows commands or other text that should be typed literally by the user.

*`Constant width italic`*
:   Shows text that should be replaced with user-supplied values or by values
    determined by context.

# Using Code Examples

Supplemental material (code examples, exercises, etc.) is available for download
at
[*https://oreil.ly/building-applications-with-ai-agents-supp*](https://oreil.ly/building-applications-with-ai-agents-supp).

If you have a technical question or a problem using the code examples, please
email [*support@oreilly.com*](mailto:support@oreilly.com).

This book is here to help you get your job done. In general, if example code is
offered with this book, you may use it in your programs and documentation. You
do not need to contact us for permission unless you’re reproducing a significant
portion of the code. For example, writing a program that uses several chunks of
code from this book does not require permission. Selling or distributing
examples from O’Reilly books does require permission. Answering a question by
citing this book and quoting example code does not require permission.
Incorporating a significant amount of example code from this book into your
product’s documentation does require permission.

We appreciate, but generally do not require, attribution. An attribution usually
includes the title, author, publisher, and ISBN. For example: “*Building
Applications with AI Agents* by Michael Albada (O’Reilly). Copyright 2025
Advance AI LLC, 978-1-098-17650-1.”

If you feel your use of code examples falls outside fair use or the permission
given above, feel free to contact us at
[*permissions@oreilly.com*](mailto:permissions@oreilly.com).

# O’Reilly Online Learning

###### Note

For more than 40 years, [*O’Reilly Media*](https://oreilly.com) has provided
technology and business training, knowledge, and insight to help companies
succeed.

Our unique network of experts and innovators share their knowledge and expertise
through books, articles, and our online learning platform. O’Reilly’s online
learning platform gives you on-demand access to live training courses, in-depth
learning paths, interactive coding environments, and a vast collection of text
and video from O’Reilly and 200+ other publishers. For more information, visit
[*https://oreilly.com*](https://oreilly.com).

# How to Contact Us

Please address comments and questions concerning this book to the publisher:

* O’Reilly Media, Inc.
* 141 Stony Circle, Suite 195
* Santa Rosa, CA 95401
* 800-889-8969 (in the United States or Canada)
* 707-827-7019 (international or local)
* 707-829-0104 (fax)
* [*support@oreilly.com*](mailto:support@oreilly.com)
* [*https://oreilly.com/about/contact.html*](https://oreilly.com/about/contact.html)

We have a web page for this book, where we list errata and any additional
information. You can access this page at
[*https://oreil.ly/building-applications-with-ai-agents-1e*](https://oreil.ly/building-applications-with-ai-agents-1e).

For news and information about our books and courses, visit
[*https://oreilly.com*](https://oreilly.com).

Find us on LinkedIn:
[*https://linkedin.com/company/oreilly-media*](https://linkedin.com/company/oreilly-media)

Watch us on YouTube:
[*https://youtube.com/oreillymedia*](https://youtube.com/oreillymedia)

# Acknowledgments

As a first-time author, it’s humbling to discover just how many people it takes
to write a book, and it’s thanks to the contributions of many wonderful people
that this book has come to fruition.

This book took over a year to write, and I’m especially grateful to the
technical reviewers who carved out their valuable time to share their detailed
feedback, perspective, and insight. Nuno Campos has brought invaluable expertise
on all things agents and LangChain and pointed me to concepts I had missed.
Prashanth Josyula held the writing and the code examples to a high bar of
technical rigor and brought deep technical expertise. Megan MacLennan has been
my technical writing expert, helping ensure accessibility and relevance to a
wide audience. Early drafts are always imperfect, and I’m deeply grateful to my
technical reviewers for tolerating my blunders and oversights with grace. Thank
you for all of your patience and your invaluable suggestions.

I also want to offer a special thanks to Anthony Wainman, who has been a thought
partner from the earliest stages of this book, and offered invaluable guidance
on the structure, content, examples, and so much more.

This book wouldn’t have been possible without the fantastic team at O’Reilly,
especially my development editor, Shira Evans, who helped shepherd the project.
Many thanks to Melissa Potter for providing early feedback and reviews, and my
production editors Ashley Stussy and Gregory Hyman. Nicole Butterfield has been
invaluable in turning concepts into reality.

I also want to thank everyone who read the early release version of the book and
offered suggestions and encouragement, including Tiago Dufau de Vargas, Jenny
Song, Leonidas Askianakis, Karthik Rao, and Drew Hoskins.

I owe so much to my brilliant current and former colleagues at Microsoft,
ServiceNow, and Uber, especially Olcay Cirit, Dawn Woodard, Sameera Poduri,
Zoubin Ghahramani, Piero Molino, Pablo Bellver, Jaikumar Ganesh, Jay Stokes,
Marc-Alexandre Cote, Chi Wang, Anush Sankaran, Amir Abdi, Tong Wang, Antonios
Matakos, Max Golovanov, Abe Starosta, Francis Beckert, Malachi Jones, Taylor
Black, Ryan Sweet, Lital Badash, Amir Pirogovsky, Alexander Stojanovic, Brad
Sarsfield, Chang Kawaguchi, Jure Leskovic, Chiyu Zhang, Andrew Zhao, Matthieu
Lin, and many, many more. Thank you for your wisdom, your insight, your
patience, your mentorship, and your many suggestions.

I would like to thank Luke Miratrix, who introduced me to statistics and taught
me how to code. I would also like to thank my core academic mentors Lisa
Schmitt, Lise Shelton, James Sheehan, Finbarr Livesey, Matthew Sommer, James
Ward, Charles Isbell, Michael Littman, Zsolt Kira, and Constantine Dovrolis for
shaping my thinking in ways big and small.

This book is, in many ways, a distillation of lessons I’ve learned throughout my
life and career, and I am grateful to many more people than I can name here. I
am deeply grateful to have the opportunity to release this book out into the
world, and I truly hope it serves you well.

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

   1. ###### [What This Book Is About](/library/view/building-applications-with/9781098176495/preface01.html#preface_what_this_book_is_about_1754586831199699)
   2. ###### [What This Book Is Not](/library/view/building-applications-with/9781098176495/preface01.html#preface_what_this_book_is_not_1754586831199722)
   3. ###### [Who This Book Is For](/library/view/building-applications-with/9781098176495/preface01.html#preface_who_this_book_is_for_1754586831199741)
   4. ###### [Navigating This Book](/library/view/building-applications-with/9781098176495/preface01.html#preface_navigating_this_book_1754586831199761)
   5. ###### [Conventions Used in This Book](/library/view/building-applications-with/9781098176495/preface01.html#_conventions_used_in_this_book)
   6. ###### [Using Code Examples](/library/view/building-applications-with/9781098176495/preface01.html#_using_code_examples)
   7. ###### [O’Reilly Online Learning](/library/view/building-applications-with/9781098176495/preface01.html#_safari_books_online)
   8. ###### [How to Contact Us](/library/view/building-applications-with/9781098176495/preface01.html#_how_to_contact_us)
   9. ###### [Acknowledgments](/library/view/building-applications-with/9781098176495/preface01.html#preface_acknowledgments_1754586831200751)
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
15. ##### [Glossary](/library/view/building-applications-with/9781098176495/glossary01.html)

    queue

    13% complete
16. ##### [Index](/library/view/building-applications-with/9781098176495/ix01.html)

    queue
17. ##### [About the Author](/library/view/building-applications-with/9781098176495/colophon01.html)

    queue
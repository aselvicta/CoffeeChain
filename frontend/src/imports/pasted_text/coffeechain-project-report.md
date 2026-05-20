this was the project UNIVERSITY OF DAR ES SALAAM 
COLLEGE OF INFORMATION AND COMMUNICATION TECHNOLOGIES 
DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING 
IS335 / CS498: Final Year Project Report – Mid of Semester One 
Project Title: COFFEECHAIN, Design and Implementation of Blockchain-Enabled Digital 
Records and Analytics Platform for Coffee Cooperatives 
Student Name 
Registration Number 
SIRILI ALBERT AMMI 
Programme 
2022-04-00378 
VICTOR ASEL KABUGUMILA 
Bsc. CEIT 
2022-04-03344 
MAXIMILIAN KAYOMBO 
Bsc. CEIT 
2022-04-03941 
JOSHUA MBWILO 
Bsc. CEIT 
2022-04-07061 
Supervisor’s Name: DR. ELLEN KALINGA 
Supervisor’s Signature: …………………… 
Bsc. CEIT 
i 
 
DECLARATION 
We, the undersigned, hereby declare that this project report titled “Coffee Chain: Design and 
Implementation of a Blockchain-Enabled Digital Records and Analytics Platform for Coffee 
Cooperatives” is our own original and unaided work. All sources of information used in the 
preparation of this report have been fully acknowledged and appropriately referenced. 
This project report has not been submitted, either in whole or in part, to any other institution for 
the award of a degree or for any academic examination. 
Signatures: 
............................................... 
Sirili Albert Ammi 
Date: ................................ 
............................................ 
Victor Asel Kabugumila 
Date: ................................. 
............................................... 
Joshua Mbwilo 
Date: ................................ 
............................................ 
Maxmillian Issiah Kayombo 
Date: ................................. 
 
Supervisor’s signature: 
............................................. 
Dr. Ellen Kalinga 
Date: ................................ 
 
  
ACKNOWLEDGEMENT 
We first would like to thank the Almighty God for the being with us throughout the development 
till the completion of the project.  
We would also like to express our sincere gratitude to our supervisor, Dr. Ellen Kalinga, for the 
guidance, constructive feedback, and academic support provided throughout the development of 
this project. Her insights and encouragement were invaluable in shaping the direction and quality 
of this work. 
We also extend our appreciation to panel supervisors for providing us with the constructive 
challenges, additions, knowledge and resources that contributed to the successful completion of 
this project. 
And lastly, special thanks go to our colleagues and peers for their cooperation, discussions, and 
moral support during the project period. Finally, we are grateful to our families and friends for 
their continuous encouragement and support throughout our academic journey.  
ii 
ABSTRACT 
Coffee cooperatives play a vital role in organizing smallholder farmers, managing agricultural 
inputs, aggregating produce, and facilitating payments. However, many cooperatives continue to 
rely on manual or fragmented digital record-keeping systems, which are prone to data 
inconsistencies, loss, and lack of transparency. These challenges hinder accountability, auditability, 
and trust among farmers, cooperative management, and oversight bodies. 
This project presents Coffee Chain, a blockchain-enabled digital records and analytics platform 
designed to improve transparency and accountability in coffee cooperatives. The system records 
cooperative operations such as input distribution, seasonal coffee production, and farmer payment 
records using a permissioned blockchain to ensure data integrity, immutability, and traceability. In 
addition, the platform provides analytics and reporting features that support cooperative 
management and authorized institutions in monitoring performance and decision-making. 
The system was developed using a web-based architecture and evaluated through functional testing 
to assess its effectiveness in addressing identified challenges.  
iii 
iv 
 
Table of Contents 
DECLARATION.............................................................................................................................. i 
ACKNOWLEDGEMENT .............................................................................................................. ii 
ABSTRACT ................................................................................................................................... iii 
LIST OF FIGURES ...................................................................................................................... vii 
LIST OF TABLES ....................................................................................................................... viii 
CHAPTER ONE ............................................................................................................................. 1 
1.1 Background of the Project ................................................................................................ 1 
1.2 Statement of the Problem ................................................................................................. 1 
1.3 Project Objectives ............................................................................................................ 2 
1.3.1 Main Objective .......................................................................................................... 2 
1.3.2 Specific objectives .................................................................................................... 2 
1.4 Significance of the Report ................................................................................................ 3 
1.5 Scope of the Project .......................................................................................................... 4 
1.6 Project Report Organization ............................................................................................. 4 
CHAPTER TWO ............................................................................................................................ 5 
LITERATURE REVIEW ............................................................................................................ 5 
2.1 Overview of Coffee Cooperative Management Systems ................................................. 5 
2.2 Input and Output Flows in Coffee Cooperatives .............................................................. 6 
2.2.1 The Top-Down Flow: Input Distribution ...................................................................... 6 
2.2.2 The Bottom-Up Flow: Produce Aggregation................................................................ 6 
2.3 Challenges in Existing Coffee Cooperative Tracking Systems ........................................ 7 
2.4 Blockchain Technology in Coffee Supply Chain Management ....................................... 7 
2.5 Distributed Nodes and Accountability in Coffee Cooperatives ....................................... 7 
v 
 
2.6 Related Works on Digital and Blockchain-Based Coffee Systems .................................. 8 
2.7 Weaknesses of Existing Coffee Cooperative Navigation and Tracking Approaches ....... 8 
2.8 Project Gap ....................................................................................................................... 9 
CHAPTER THREE ...................................................................................................................... 10 
METHODOLOGY ................................................................................................................... 10 
3.1 Development Methodology ............................................................................................ 10 
3.2 Proper Development Approach ...................................................................................... 10 
2.1 System Implementation .................................................................................................. 12 
3.4 System Testing, Performance Evaluation, and Deployment .......................................... 13 
CHAPTER FOUR ......................................................................................................................... 14 
COFFEECHAIN SYSTEM ANALYSIS AND DESIGN ......................................................... 14 
4.1 Data Collected ................................................................................................................ 14 
4.1.1 Data Collected from Questionnaires ........................................................................... 14 
4.1.2 Data Collected from Interviews .................................................................................. 15 
4.1.3 Summary of Identified Vulnerabilities ....................................................................... 16 
4.2 System Functionalities ................................................................................................... 17 
4.2.1 Core System Modules ................................................................................................. 17 
4.2.2 Functional Requirements ............................................................................................ 17 
4.2.3 Non-Functional Requirements .................................................................................... 19 
4.3 Non-Functional Requirements ....................................................................................... 20 
4.3.1 Primary actors ............................................................................................................. 20 
4.3.2 Secondary actors ......................................................................................................... 21 
4.4 Use Case Diagrams and Use Case Description .............................................................. 23 
4.4.1 Use Case 1: Distribution of Agricultural Inputs ......................................................... 23 
vi 
 
4.4.2 Use Case 2: Production Data Logging ....................................................................... 24 
4.4.3 Use Case 3: Supply Chain Audit and Reporting ......................................................... 25 
4.4.4 Use Case: Manage User Accounts .............................................................................. 26 
4.4.5 Use Case: Assign Roles and Permissions ................................................................... 27 
4.4.6 Use Case: Register Blockchain Node ......................................................................... 27 
4.8 Database Architecture .................................................................................................... 36 
References ..................................................................................................................................... 37 
 
 
  
LIST OF FIGURES 
Figure 3.2-1Agile development methodology diagram ------------------------------------------------ 11 
Figure 4.4.6-1 Use case of Diagram of CoffeeChain system ------------------------------------------ 29 
Figure 4.4.6-2 Production logging ------------------------------------------------------------------------ 30 
Figure 4.4.6-3 Record Fertilizer distribution with USSD farmer confirmation --------------------- 31 
Figure 4.4.6-4 Managing user account sequence diagram --------------------------------------------- 32 
Figure 4.4.6-5 CoffeeChain system class diagram ------------------------------------------------------ 33 
vii 
viii 
 
LIST OF TABLES 
Table 2.1-1 Area that Produce Coffee in Tanzania ......................................................................... 6 
Table 3.2-1 Presents the specific objectives of the project and the corresponding approaches that 
will be applied to achieve each objective ..................................................................................... 11 
Table 3.4-1 The planned testing and performance evaluation methods for this project ............... 13 
Table 4.2.3-1 Non-Functional Requirements for CoffeeChain ..................................................... 19 
Table 4.3.2-1 System Actors for CoffeeChain .............................................................................. 22 
Table 4.4.1-1 Distribution of Agricultural Inputs use case ........................................................... 23 
Table 4.4.2-1 Record Seasonal Coffee Production use case ......................................................... 24 
Table 4.4.3-1 Generate Supply Chain Audit Report use case ....................................................... 25 
Table 4.4.4-1 Manage User Accounts use case ............................................................................. 26 
Table 4.4.5-1 Assigning Roles and Permissions use case ............................................................. 27 
Table 4.4.6-1 Registering Blockchain Node use case ................................................................... 28 
Table 4.4.6-2 Entity Relationship Diagram illustrating database structure .................................. 35 
CHAPTER ONE 
1.1 Background of the Project 
Coffee cooperatives play a critical role in organizing smallholder farmers, managing agricultural 
inputs, aggregating produce, and facilitating payment settlements. In many coffee-producing 
regions like Kagera for instance, cooperatives act as the primary link between farmers, markets, 
and oversight institutions. Effective record management within these cooperatives is essential for 
ensuring transparency, accountability, and trust among stakeholders. 
Despite their importance, many coffee cooperatives continue to rely on manual or semi-digital 
record keeping methods such as paper files, notebooks, and spreadsheets. These approaches are 
prone to data loss, duplication, inconsistencies, and unauthorized modification. Records related to 
input distribution, seasonal coffee production, and farmer payments are often fragmented across 
multiple sources, making it difficult to verify historical data or conduct reliable audits. 
With the increasing demand for transparency and accountability in agricultural value chains, there 
is a growing need for secure and reliable digital systems that can manage cooperative records 
effectively. Blockchain technology offers a promising solution due to its ability to provide 
immutable, traceable, and tamper-resistant records. When combined with analytics tools, 
blockchain-enabled systems can also support cooperative management and oversight bodies by 
providing meaningful summaries and insights from recorded data. 
This project aims to address challenges associated with record management in coffee cooperatives 
by developing a secure and transparent digital platform tailored to cooperative operations. 
1.2 Statement of the Problem 
Many coffee cooperatives face persistent challenges in maintaining accurate, secure, and 
transparent operational records. Manual and fragmented digital record keeping systems often result 
1 
in incomplete data, inconsistencies, and difficulties in tracking historical information across 
farming seasons. These challenges limit the ability of cooperative management and oversight 
institutions to verify records related to input distribution, production performance, and farmer 
payments. 
Furthermore, the lack of tamper resistant and auditable records reduces trust among farmers, 
cooperative officials, and regulatory bodies. Existing enterprise systems are often unsuitable for 
cooperative environments due to high costs, complexity, and assumptions of centralized and high 
trust data entry. As a result, there is a need for a system that ensures data integrity, transparency, 
and accountability while remaining practical for cooperative operations. 
1.3 Project Objectives 
This section outlines the objectives that guide the design and implementation of the CoffeeChain 
system. 
1.3.1 Main Objective 
The main objective of this project is to design and implement a blockchain enabled digital records 
and analytics platform that enhances transparency, data integrity, and accountability in the 
management of coffee cooperatives. 
1.3.2 Specific objectives 
i. 
ii. 
iii. 
iv. 
To establish system requirements for the CoffeeChain platform. 
To design the blockchain-enabled digital records and analytics system. 
To implement the designed CoffeeChain system. 
To test and evaluate the CoffeeChain system.  
2 
1.4 Significance of the Report 
The following is a list of some of the significance of the project on the bases of stakeholders 
involved in it: 
i. 
To Coffee Cooperatives 
The project provides them with a secure and reliable digital platform for managing operational 
records such as input distribution, production data, and farmer payments. By replacing manual 
and fragmented record keeping methods, the system reduces data inconsistencies, loss of 
records, and unauthorized modifications. The use of blockchain technology ensures that once 
records are entered, they cannot be altered without detection, thereby improving 
accountability within cooperative management. 
ii. To Farmers 
Farmers benefit from increased transparency in cooperative operations. Accurate and 
verifiable records of inputs received, production quantities, and payments help reduce disputes 
and misunderstandings between farmers and cooperative officials. Improved trust in 
cooperative record management can enhance farmer participation and confidence in 
cooperative systems. 
iii. To Oversight and Regulatory Institutions 
Oversight bodies and regulatory institutions require accurate and auditable records to monitor 
cooperative performance and ensure compliance with policies and regulations. The blockchain 
enabled system provides tamper-resistant and traceable records, simplifying audit processes 
and reducing the time and effort required to verify data. This supports improved governance 
and monitoring of these coffee cooperatives. 
iv. To the Agricultural Sector 
By improving record management and accountability at the cooperative level, the project 
contributes to better governance in the coffee value chain. Reliable data supports informed 
decision-making, resource planning, and policy formulation, which can positively impact 
productivity and sustainability in the agricultural sector. 
v. To the Academic and Research Community 
3 
The project contributes to applied research on the use of blockchain technology in agricultural 
cooperative management. It provides a practical case study demonstrating how blockchain 
can be integrated with digital record systems and analytics to address accountability 
challenges in distributed and low-trust environments. 
1.5 Scope of the Project 
The scope of this project focuses on the design and implementation of a blockchain-enabled digital 
records and analytics platform for coffee cooperatives. The system covers record management 
related to input distribution, tracking of the seasonal coffee production, and farmer payment 
records, as well as basic analytics and reporting features. 
The project does not include financial transaction processing, mobile application development, 
advanced predictive analytics, or smart contract-based payment automation. These areas are 
considered outside the scope of this study. 
1.6 Project Report Organization 
This project report is organized into five chapters. Chapter One introduces the background of the 
study, problem statement, objectives, significance, scope, and structure of the report. Chapter Two 
presents a review of related literature on digital record management systems, blockchain 
technology, and analytics in cooperative management. Chapter Three describes the methodology 
used in system design and implementation. Chapter Four presents system implementation details, 
results, and discussion. Chapter Five concludes the study and provides recommendations for future 
work. 
4 
CHAPTER TWO 
LITERATURE REVIEW 
2.1 Overview of Coffee Cooperative Management Systems 
Coffee cooperatives serve as the foundational pillar for smallholder farmers, facilitating access to 
essential agricultural inputs and aggregating production for global markets. In Tanzania, these 
cooperatives function within a rigorous multi-tier hierarchy. This structure begins at the National 
level with regulatory bodies such as the Tanzania Coffee Board (TCB), extending through 
Regional and District authorities, down to the primary Agricultural Marketing Co-operative 
Societies (AMCOS). This governance framework is designed to regulate the value chain, ensuring 
that resource distribution is equitable and that production standards are maintained across all 
geographical zones. 
Despite the importance of these structures, traditional paper-based management often suffers from 
data silos and a lack of real-time visibility. Consequently, digitalization has emerged as a critical 
intervention to enhance record-keeping, traceability, and financial accountability. Modern digital 
systems are designed to track the "Full-Circle" supply chain—monitoring inputs like fertilizers 
and seedlings distributed from the national level, as well as outputs such as cherry deliveries and 
parchment processing. By integrating technologies like blockchain, these systems move beyond 
simple data entry to provide transparency and immutable trust, which are vital for the economic 
sustainability of the coffee sector. 
5 
Table 2.1-1 Area that Produce Coffee in Tanzania 
Region 
Districts 
Coffee Type 
Kilimanja
ro 
Major Cooperative/Union 
Moshi Rural, Hai, Rombo 
Arabica 
KNCU, KILICAFE 
Mbeya 
Rungwe, Mbeya Rural, Busokelo 
Arabica 
Songwe 
MBEYA CU, RCU 
Mbozi, Ileje 
Arabica 
Ruvuma 
Mbozi Coffee Societies 
Mbinga, Songea Rural 
Arabica 
Kagera 
MBICU, Songea Societies 
Bukoba, Muleba, Karagwe, Biharamulo 
Robusta 
Arusha 
KCU 
Arumeru, Monduli 
Arabica 
Arusha Coffee Societies 
Morogoro 
Mvomero, Ulanga, Morogoro Rural 
Arabica 
Morogoro Cooperative Societies 
2.2 Input and Output Flows in Coffee Cooperatives 
2.2.1 The Top-Down Flow: Input Distribution 
Agricultural inputs, specifically fertilizers are typically procured at the national or central levels. 
These resources are then distributed through a hierarchical chain passing from zonal and regional 
offices before finally reaching the primary cooperatives (AMCOS) and individual farmers. As 
noted by the FAO (2017) and the World Bank (2020), maintaining granular documentation at every 
stage of this distribution is vital. Without a robust tracking mechanism, the supply chain is 
vulnerable to losses, misallocation, and inequitable access, which directly undermines farmer 
productivity. 
2.2.2 The Bottom-Up Flow: Produce Aggregation 
The second flow represents the bottom-up movement of coffee produce from the farm-gate to 
global markets. Farmers deliver coffee cherries to their respective AMCOS, where production data 
is aggregated and reported upward to regional and national boards. This data serves as the basis 
for payment calculations, export logistics, and national performance assessments. 
6 
2.3 Challenges in Existing Coffee Cooperative Tracking Systems 
Despite the availability of digital tools, many coffee cooperatives continue to rely on centralized 
databases, spreadsheets, or manual reporting methods. These approaches present several 
challenges. First, centralized systems place control of data within a single authority, making 
records vulnerable to manipulation or unauthorized changes. Second, manual data handling 
increases the risk of errors, delays, and misreporting, particularly when information passes through 
multiple administrative levels. 
Furthermore, limited transparency in existing systems makes it difficult to verify whether fertilizer 
distributions correspond to actual coffee production. Farmers and cooperatives may lack visibility 
into how data is aggregated or modified at higher levels, which can reduce trust in the cooperative 
management process. These challenges highlight the need for more reliable and tamper-resistant 
tracking mechanisms within coffee cooperative systems. 
2.4 Blockchain Technology in Coffee Supply Chain Management 
Blockchain technology enhances transparency and traceability by operating as a distributed ledger 
where records are stored in sequential, cryptographically linked blocks. Unlike centralized 
databases, this ledger is shared across multiple nodes maintained by diverse stakeholders, such as 
the National Coffee Board, Regional offices, and AMCOS. Each transaction is secured by 
cryptographic hashes, making stored data tamper-resistant and verifiable without reliance on a 
central intermediary. Within coffee cooperatives, blockchain functions as a complementary trust 
layer to record fertilizer distribution. This model is ideal for environments with multiple 
autonomous actors and shared accountability, as it ensures data integrity and auditability across 
the entire supply chain. 
2.5 Distributed Nodes and Accountability in Coffee Cooperatives 
Blockchain technology is decentralized, with multiple independent nodes maintaining 
synchronized copies of a shared ledger. In coffee cooperatives, these nodes can include regulators, 
regional offices, and cooperative unions. Each node validates transactions based on consensus 
7 
rules, reducing reliance on a central authority and enhancing transparency, data integrity, and 
resistance to manipulation  
2.6 Related Works on Digital and Blockchain-Based Coffee Systems 
IBM Food Trust (Honduras) 
The IBM Food Trust was implemented in Honduras through a partnership between IBM and Heifer 
International, specifically working with the COPRANIL cooperative. The project’s purpose was 
to provide smallholder farmers with access to global markets by recording coffee production and 
processing data on an immutable ledger. This enabled international buyers to verify "farm-to-cup" 
traceability and ensured farmers received premium prices for their beans. While successful for 
export transparency, the system focuses on market-facing data rather than the internal governance 
and resource tracking required within a national cooperative hierarchy. 
Dimitra (East Africa) 
The Dimitra AgTech platform has been implemented across East Africa, including countries like 
Uganda and Kenya, often in collaboration with local governments and NGOs. Its primary purpose 
is to empower individual smallholders by using blockchain and AI to digitize farm-level records, 
such as soil health and crop yields. By creating a connected farmer profile, the system helps 
farmers obtain certifications and secure financing. However, its scope is centered on individual 
farm management and broad ecosystem data rather than the specific, top-down reconciliation of 
fertilizer and input distributions between a national board and local AMCOS. 
2.7 Weaknesses of Existing Coffee Cooperative Navigation and Tracking Approaches 
Existing tracking approaches in coffee cooperatives, including paper-based records, verbal 
reporting, and centralized digital systems, suffer from several weaknesses. These methods are 
prone to miscommunication, delayed updates, and inconsistencies in reported quantities. In many 
cases, historical records can be altered without leaving an auditable trace, reducing confidence in 
cooperative data. 
8 
Additionally, most current systems lack real-time verification mechanisms that allow different 
administrative levels to independently confirm fertilizer distributions or coffee deliveries. This 
limitation makes it difficult to identify discrepancies between inputs and outputs and undermines 
effective monitoring and evaluation. 
2.8 Project Gap 
Currently, coffee cooperative systems lack an integrated, tamper-resistant mechanism for tracking 
quantifiable inputs and outputs across all administrative levels. In the BTN coffee cooperative 
context, inconsistencies between fertilizer distribution and coffee aggregation are difficult to detect 
due to fragmented data management and centralized control structures. 
This gap highlights the need for a blockchain-enabled coffee cooperative management system that 
records fertilizer and coffee movements as immutable transactions across distributed nodes. Such 
a system would improve transparency, support accountability, and enable early detection of 
inconsistencies while remaining aligned with existing coffee cooperative structures. 
9 
CHAPTER THREE 
METHODOLOGY 
3.1 Development Methodology 
The CoffeeChain system will be developed using an Agile development methodology combined 
with a modular system design approach. The Agile methodology is chosen to support incremental 
and iterative development, allowing system features to be implemented in short development 
cycles (sprints). Core functionalities such as user authentication, digital record management, 
blockchain-based data storage, and analytics and reporting will be developed in phases, enabling 
early validation of requirements and flexibility in accommodating feedback. 
A modular development approach will be adopted to ensure clear separation of system 
components. The system will be structured into independent modules, including the web-based 
user interface, backend services and APIs, permissioned blockchain layer, analytics and reporting 
module, and database management system. Each module will be developed and tested 
independently before integration, reducing complexity and improving maintainability. 
The combination of Agile and modular development is expected to enhance system scalability, 
security, and reliability while minimizing development risks. Continuous testing and evaluation 
will be carried out throughout the development process to ensure data integrity, proper system 
functionality, and compliance with project objectives. 
3.2 Proper Development Approach 
The CoffeeChain system will be developed as a web-based platform to support secure digital 
record management and analytics for coffee cooperatives. The development process will begin 
with requirements analysis, focusing on identifying functional and non-functional requirements 
based on existing cooperative record-keeping challenges. These requirements will guide system 
design, technology selection, and implementation planning. 
The system will be designed using a modular architecture, separating the frontend interface, 
backend logic, permissioned blockchain layer, database, and analytics module. Standard system 
modelling tools such as use case diagrams, ER diagrams, class diagrams, and sequence diagrams 
10 
will be used to define system structure and interactions. Development will follow an Agile 
methodology, allowing incremental implementation, testing, and refinement of system 
components. Testing activities will be conducted throughout development to ensure correctness, 
data integrity, and reliability. 
Figure 3.2-1Agile development methodology diagram 
Table 3.2-1 Presents the specific objectives of the project and the corresponding approaches that 
will be applied to achieve each objective 
S/N 
1 
2 
3 
4 
Specific Objective 
To establish system requirements for 
the CoffeeChain platform. 
To design the blockchain-enabled 
digital records and analytics system. 
To 
implement 
the 
CoffeeChain system. 
designed 
To test and evaluate the CoffeeChain 
system. 
Approach 
Literature review, interviews, and use case modeling. 
System architecture design, ER diagrams, and sequence 
diagrams. 
Web frontend development, backend logic, and blockchain 
integration 
Unit testing, functional testing and security verification. 
11 
12 
 
2.1 System Implementation 
Table 3.2 presents the tools and technologies that will be used for system coding and 
implementation of the CoffeeChain platform. These tools have been selected to support secure 
digital record management, permissioned blockchain integration, analytics processing, and web
based system access. Each technology plays a specific role in ensuring system reliability, 
scalability, and data integrity. 
S/N Tool/Technology Description Purpose 
1 ReactJS A modern JavaScript library for 
building user interfaces 
Developing the web-based user interface for 
cooperative users and administrators 
2 Django High-level Python web framework Implementing backend logic, authentication, 
and system workflows 
3 Django REST 
Framework 
Toolkit for building Web APIs Providing RESTful APIs for frontend
backend communication 
4 PostgreSQL Open-source relational database 
system 
Storing user data, cooperative records, and 
transactional information 
5 Permissioned 
Blockchain 
Blockchain network with controlled 
access 
Ensuring data integrity, transparency, and 
tamper resistance of records 
6 Web3 / 
Blockchain SDK 
Blockchain interaction libraries Connecting the backend system with the 
permissioned blockchain 
7 Analytics Module Data processing and reporting tools Generating reports and performance analytics 
for cooperative management 
8 Git & GitHub Version control tools Managing source code and supporting 
collaborative development 
3.4 System Testing, Performance Evaluation, and Deployment 
Testing is a critical phase in software development that ensures the system is reliable, secure, and 
function according to the intended requirements before it is deployed for real-world use. In the 
CoffeeChain project, testing and performance evaluation will be conducted to verify that the 
blockchain-enabled digital records platform meets the objectives of managing cooperative 
operations, ensuring data integrity, and supporting analytics for performance monitoring. 
The testing process for CoffeeChain will involve three main approaches: Unit Testing, Integration 
Testing, and End-to-End Testing. Unit Testing will focus on validating individual components, 
such as login authentication and input validation for email addresses. Integration Testing will 
ensure that the interactions between different system modules, including API calls and the 
connection between the web interface and blockchain backend, function seamlessly. Finally, End
to-End Testing will evaluate the complete user workflow, from recording cooperative inputs to 
generating reports, ensuring that the system performs as expected from start to finish. 
Once implementation is complete, the CoffeeChain web application will be hosted to simulate a 
production environment. This deployment will allow for realistic testing and performance 
evaluation in an online setting, helping to refine the system into a robust and reliable application 
ready for cooperative use. 
Table 3.4-1 The planned testing and performance evaluation methods for this project 
S/N 
1 
2 
3 
Action 
Unit Testing 
Integration 
Testing 
End-to-End 
Testing 
Purpose 
Validate individual system functionalities, such as login 
authentication and email format validation 
Verify API calls and integration of system components to 
ensure seamless operation according to user requirements 
Evaluate complete navigation flow and user experience of 
the system 
Tool(s) to be Used 
Django Test Case 
Postman, Web browser 
Web browser, Postman 
13 
CHAPTER FOUR 
COFFEECHAIN SYSTEM ANALYSIS AND DESIGN 
4.1 Data Collected 
The operational structure of coffee cooperatives was analyzed through Document review, and 
stakeholder interviews. These cooperatives function as integrated ecosystems involving farmers, 
management committees, and collection centers coordinated oversight bodies. Their core lifecycle 
includes farmer registration, input distribution (fertilizers and seedlings), crop aggregation, quality 
grading, and payment settlement. Mapping this hierarchy was essential to understanding the flow 
of data from the village level to central authorities. 
Deconstructing this workflow helped identify nodes where transparency and immutable record
keeping are currently absent. The study revealed that the transition of physical goods such as 
fertilizer or into digital records is highly vulnerable to human error and manipulation. This analysis 
formed the foundation for CoffeeChain, ensuring its smart contract logic addresses the actual gaps 
within the Tanzanian coffee supply chain. 
4.1.1 Data Collected from Questionnaires 
Questionnaires were distributed to cooperative members, agricultural officers, and selected 
farmers to analyse: 
 Current record-keeping methods 
 Challenges in data management 
 Transparency levels in payment and production records 
 Readiness to adopt digital systems 
Findings revealed that: 
 Approximately 68% of cooperatives rely primarily on manual record-keeping (paper-based 
ledgers). 
 22% use basic spreadsheet systems. 
 Only 10% use partially digitized management systems. 
14 
The majority of respondents reported the following challenges: 
 74% experienced data inconsistencies between production and payment records. 
 63% reported delays in accessing historical records. 
 59% expressed concerns about transparency in seasonal payment calculations. 
However, 81% of respondents indicated readiness to adopt a secure digital platform if it 
improves accountability and simplifies reporting. 
These findings demonstrated the need for a secure digital records system with tamper-resistant 
storage and accessible analytics. 
4.1.2 Data Collected from Interviews 
Interviews were conducted with District Agricultural Officers (DAOs), and coffee farmers 
belonging to AMCOS in Karagwe to evaluate the current state of subsidies distribution. The 
findings reveal a transition from paper to digital, yet significant gaps in trust and traceability 
remain. 
i. 
ii. 
Centralized Government Platforms  
Tanzania currently utilizes the Digital Fertilizer Subsidy Distribution System (Ruzuku) and 
the Integrated Kilimo System (IKS). 
 The Reality: While these systems exist centrally at the Ministry level, they operate as 
a "Black Box" for the end-user. Data is entered by officials, but farmers have no way 
to verify if the subsidy allocated to them was actually used by them or diverted. 
 The Trust Gap: Because the database is centralized, records can be edited or "cleared" 
by system administrators without a permanent audit trail that is visible to the AMCOS 
or the farmer. 
The Officer-to-Farmer Gap 
In regions like Karagwe, the distribution of coffee-specific inputs (seedlings and copper
based fungicides) still relies on the physical presence of Agricultural Officers. 
15 
 There is no Handshake mechanism. An officer may record that 50 farmers received 
inputs, but there is no digital confirmation (like a USSD PIN or Blockchain Hash) from 
the farmer to prove the transaction actually occurred. 
 Implementation Lag: While maize and cotton sectors have seen digital pilot programs, 
coffee production in Karagwe remains largely manual in its verification. 
iii. 
Manual Ledger Books (The AMCOS Bottleneck) 
Despite national digital shifts, the primary record at the village level remains the Manual 
Ledger. 
 When fertilizer arrives at an AMCOS warehouse, it is recorded in a physical book. 
These books are prone to forged entries where inputs are signed for by people who do 
not exist, or the quantities are inflated. 
 Data Loss: Physical ledgers are frequently lost, damaged, or altered, making it 
impossible for the Tanzania Coffee Board (TCB) to perform an accurate historical audit 
of input effectiveness. 
4.1.3 Summary of Identified Vulnerabilities 
The truth discovered during the data collection phase is that the digitalization of Tanzania’s 
agriculture is currently top-down and centralized. This leads to: 
 Administrative Manipulation: Centralized databases allow for retroactive data changes. 
 Lack of Transparency: Farmers cannot trace a bag of fertilizer back to its original batch to 
verify quality or origin. 
 Subsidies are often drained by non-existent farmers because the current systems lack a 
decentralized proof of receipts. 
16 
17 
 
4.2 System Functionalities 
System functionality defines the CoffeeChain platform's capability to execute tasks within the 
cooperative value chain. It ensures that digital interactions mirror the physical movement of inputs 
and coffee produce accurately and securely. 
4.2.1 Core System Modules 
i. Identity & Role Management: Managing decentralized identities for farmers and AMCOS 
staff. 
ii. Asset Tracking: Tracking the lifecycle of inputs and coffee batches. 
iii. Smart Contract Execution: Automating distribution rules and payment triggers. 
iv. Immutable Audit Ledger: Providing a tamper-proof history of all cooperative activities. 
v. Analytics Engine: Converting blockchain data into actionable insights for the TCB and 
Cooperatives leaders. 
4.2.2 Functional Requirements 
The functional requirements specify the system's active behaviors, categorized into Evident (user
facing) and Hidden (internal blockchain logic). 
Ref. No Functional Description Category 
F1 USER & IDENTITY MANAGEMENT  
F1.1 Allow registration of Farmers (via IKS ID), AMCOS staff, and TCB auditors. Evident 
F1.2 Multi-factor authentication for transaction confirmation. Evident 
F1.3 Assign role-based permissions (for example; Only Clerk can initiate distribution). Hidden 
F2 INPUT & PRODUCE LEDGER  
F2.1 Record fertilizer distribution linked to a specific Farmer ID. Evident 
F2.2 Log coffee collection weights and quality grades at the AMCOS center. Evident 
F2.3 Digital Handshake: Require farmer confirmation (via USSD) for receipts. Hidden 
18 
 
F3 BLOCKCHAIN OPERATIONS  
F3.1 Generate a unique cryptographic hash for every input/output transaction. Hidden 
F3.2 Commit verified transactions to the permissioned ledger  Hidden 
Ref No Functional Description Category 
F1 USER & IDENTITY MANAGEMENT  
F1.1 Allow registration of Farmers (via IKS ID), AMCOS staff, and TCB auditors. Evident 
F1.2 Multi-factor authentication for transaction confirmation. Evident 
F1.3 Assign role-based permissions (for example; Only Clerk can initiate distribution). Hidden 
F2 INPUT & PRODUCE LEDGER  
F2.1 Record fertilizer distribution linked to a specific Farmer ID. Evident 
F2.2 Log coffee collection weights and quality grades at the AMCOS center. Evident 
F2.3 Digital Handshake: Require farmer confirmation (via USSD) for receipts. Hidden 
F3 BLOCKCHAIN OPERATIONS  
F3.1 Generate a unique cryptographic hash for every input/output transaction. Hidden 
F3.2 Commit verified transactions to the permissioned ledger  Hidden 
F3.3 Provide a verification tool for farmers to check the immutability of their records. Evident 
F4 REPORTING & ANALYTICS  
19 
 
F4.1 Generate Input and Yield performance reports. Evident 
F4.2 Export cryptographically signed audit reports for regulatory bodies. Evident 
F5 AUDIT & COMPLIANCE  
F5.1 Maintain a non-deletable history of all record modifications (Audit Trail). Hidden 
F5.2 Flagging of forgery  patterns or distribution anomalies. Hidden 
 
4.2.3 Non-Functional Requirements 
These define the quality and constraints of the CoffeeChain environment, focusing on the unique 
challenges of rural connectivity and data integrity. 
Table 4.2.3-1 Non-Functional Requirements for CoffeeChain 
Attribute Non-functional Requirement 
Security Immutability: Once a transaction is validated, it cannot be altered. 
Encryption: All personally Identifiable Information must be hashed. 
  
Integrity Consensus: Transactions must be validated by multiple nodes (AMCOS/TCB) before 
finality. 
Usability The interface must support English and Swahili for ease of use villages (Karagwe) 
Performance Transaction confirmation should occur in under 10 seconds. 
Availability The system allows Offline Queueing for areas with poor internet, syncing once back online. 
Scalability The architecture must support the addition of new AMCOS nodes without degrading speed. 
 
4.3 Non-Functional Requirements 
In systems analysis and design, system actors are the external entities that interact with a system 
in order to achieve defined goals. Actors may represent individuals, organizational roles, or 
external systems that initiate, receive, or influence system processes. Our system consists of two 
main types of actors, namely primary actors and secondary actors. 
The CoffeeChain system operates within the Agricultural Marketing Cooperative Society 
(AMCOS) structure. While AMCOS is the primary institutional stakeholder, interaction with the 
digital platform occurs through designated representatives who act on behalf of the cooperative. 
The following subsections analyse the individual actors involved in the system and their respective 
responsibilities. 
4.3.1 Primary actors 
Primary actors are those who directly initiate operational transactions and interact with the system 
regularly.  
a) AMCOS Clerk (Operational Representative) 
While AMCOS is the primary institutional stakeholder, interaction with the digital platform occurs 
through designated representatives who act on behalf of the cooperative. The AMCOS Clerk 
represents the cooperative in dayto-day operational activities within CoffeeChain. This actor 
serves as the primary initiator of input distribution transactions and production data recording. He 
is also responsible for registering incoming agricultural input batches and documenting their 
allocation to registered farmers, but also recording production quantities delivered by farmers 
when required. 
b) Farmer (End User and Producer) 
The farmer confirms receipt of agricultural inputs, submits or confirms seasonal production data, 
all of which is stored in a relational database and cryptographically anchored to the blockchain. 
Farmers do not have privileges to edit or delete historical records rather their role strengthens 
decentralized validation while preserving data integrity. 
20 
4.3.2 Secondary actors 
Secondary actors participate in governance, oversight, or infrastructure management rather than 
routine operational tasks. 
a) Tanzania Coffee Board (TCB) and District Agricultural Officer (DAO) (Regulatory Actors) 
Regulatory actors, including representatives from the Tanzania Coffee Board (TCB) and District 
Agricultural Offices, are granted read-only access to CoffeeChain to perform oversight and 
compliance monitoring by utilizing the system's reporting tools, they can review total input 
distributions, farmer production quantities, and the correlation between allocations and actual 
outputs to identify anomalies suggesting irregularities. Because all transaction hashes are anchored 
to a permissioned blockchain, regulatory bodies rely on immutable digital records rather than 
manually compiled paper reports. 
b) System Administrator 
The System Administrator serves as the technical custodian of the CoffeeChain platform, focusing 
on maintaining system operational integrity rather than participating in agricultural activities. Key 
responsibilities include managing user accounts and enforcing role-based access control to ensure 
secure system entry. This actor is also tasked with maintaining node connectivity within the 
permissioned blockchain network and monitoring system logs to ensure optimal performance. 
Furthermore, the administrator manages the critical API integration between identity systems and 
blockchain addresses.   
21 
22 
 
 
Table 4.3.2-1 System Actors for CoffeeChain 
Actor Description 
Farmer Acts as the end-recipient and primary validator, responsible for 
confirming the physical receipt of agricultural inputs and submitting 
seasonal coffee production data. 
Cooperative Staff 
(AMCOS Clerk) 
Responsible for the operational entry of distribution records. They 
initiate the "digital handshake" by assigning input batches to farmers 
and recording harvest quantities delivered to the cooperative centers. 
System 
Administrator 
A technical role focused on platform maintenance rather than agricultural 
operations. Responsibilities include managing role based access control 
(RBAC), maintaining blockchain node connectivity, and ensuring the 
integrity of API integrations between the database and the ledger. 
Oversight 
Authority 
(TCB/DAO) 
Regulatory bodies granted high-level visibility to monitor cooperative 
compliance. They utilize the blockchain to verify that distributed inputs 
correlate with reported production levels, allowing for the detection of 
supply leakages or "ghost" records without requiring physical presence. 
 
  
4.4 Use Case Diagrams and Use Case Description 
A use case describes how system actors interact with CoffeeChain to accomplish operational 
objectives. 
The focus of CoffeeChain is not automation of transactions, but the controlled documentation, 
verification, and auditability of input distribution and production data. Therefore, the most critical 
aspect of use case modeling in this project is the interaction pattern between actors, particularly 
how responsibilities are distributed and validated across multiple levels. 
The primary operational interactions are categorized into three core use cases: 
i. 
ii. 
iii. 
iv. 
v. 
vi. 
Distribution of Agricultural Inputs 
Production Data Logging 
Supply Chain Audit and Reporting 
Manage User Accounts 
Assign Roles and Permissions 
Register and Maintain Blockchain Nodes 
4.4.1 Use Case 1: Distribution of Agricultural Inputs 
This use case is fundamental to the system’s traceability objective. By anchoring the distribution 
event to a permissioned blockchain ledger, the platform prevents retroactive manipulation of 
supply records and enables downstream analytics comparing distributed inputs against production 
output. 
Table 4.4.1-1 Distribution of Agricultural Inputs use case 
Field 
Use Case 
Distribution of Agricultural Inputs 
Details 
Actors 
AMCOS Clerk, Farmer 
Description 
Records the transfer of agricultural inputs (e.g., fertilizer, seedlings) from the cooperative to 
a registered farmer. The transaction establishes a verifiable and immutable record linking 
the farmer to the distributed inputs. 
23 
24 
 
Precondition Clerk is authenticated;  
Input batch is registered in the system;  
Farmer is registered with valid identification details;  
Available inventory exists. 
Main Flow 1. Clerk selects input type and batch ID  
2. Clerk enters Farmer ID  
3. System verifies farmer registration and farm size eligibility  
4. System updates cooperative inventory   
5. Transaction data is hashed  
6. Hash is written to the permissioned blockchain ledger. 
Post condition Input ownership record is immutably stored;  
Cooperative inventory is decremented;  
Audit trail is created linking farmer and input batch. 
 
4.4.2 Use Case 2: Production Data Logging 
This use case operationalizes the accountability mechanism of CoffeeChain by creating a verifiable 
link between inputs distributed and harvest achieved, the system enables analytical assessment of 
productivity trends and anomaly detection without introducing financial processing components. 
Table 4.4.2-1 Record Seasonal Coffee Production use case 
Field Details 
Use Case Record Seasonal Coffee Production 
Actors Cooperative Staff, Farmer 
Description Captures seasonal harvest output and links it to inputs received to analyze production 
efficiency and detect irregularities. 
25 
 
Precondition User is authenticated; 
Farmer has a history of received inputs;  
Production season is active. 
Main Flow 1. User selects farmer  
2. User enters harvest weight (kg)  
3. System retrieves historical input records  
4. System correlates production with input history  
5. Record is hashed → 6. Hash is written to blockchain. 
Post 
condition 
Harvest record is permanently stored;  
Data is cryptographically secured against retroactive changes;  
Production record is linked to input distribution history. 
 
4.4.3 Use Case 3: Supply Chain Audit and Reporting 
This use case demonstrates the auditability advantage of a permissioned blockchain architecture 
since data entries are cryptographically hashed and time-stamped, supervisory authorities can 
verify operational consistency without relying solely on cooperative-reported summaries. 
Table 4.4.3-1 Generate Supply Chain Audit Report use case 
Field Details 
Use Case Generate Supply Chain Audit Report 
Actors Agricultural Officer, TCB Representative 
Description Provides oversight visibility into cooperative input distribution and production performance 
using immutable ledger records. 
Precondition Auditor is authenticated with appropriate access privileges;  
Ledger contains distribution and production records. 
26 
 
Main Flow 1. Auditor selects cooperative and reporting period  
2. System retrieves immutable distribution records  
3. System retrieves linked production data  
4. System aggregates and analyzes records  
5. System generates structured audit report. 
Post 
condition 
Report reflecting verified ledger data is generated;  
Discrepancies or anomalies are highlighted;  
No ledger data is altered during report generation. 
 
4.4.4 Use Case: Manage User Accounts 
This use case enforces controlled system access and supports accountability by maintaining 
traceable user identities within the permissioned environment. 
Table 4.4.4-1 Manage User Accounts use case 
Field Details 
Use Case Manage User Accounts 
Actors System Administrator 
Description Creates, updates, deactivates, and maintains system user accounts to enforce role-based 
access control. 
Precondition Administrator is authenticated with elevated privileges. 
Main Flow 1. Administrator selects account management function  
2. Enters user details  
3. Assigns role (Clerk, Farmer, Auditor)  
4. System validates role assignment  
5. Account is created or updated. 
27 
 
Post condition User account is securely stored; Access permissions are enforced. 
 
4.4.5 Use Case: Assign Roles and Permissions 
This use case ensures that each actor can only perform functions consistent with their institutional 
responsibilities, thereby protecting system integrity and preventing unauthorized operations. 
Table 4.4.5-1 Assigning Roles and Permissions use case 
Field Details 
Use Case Assign Roles and Permissions 
Actors System Administrator 
Description Configures role-based access rights to ensure users only perform authorized operations. 
Precondition Administrator is authenticated;  
Role definitions exist in system configuration. 
Main Flow 1. Administrator selects user  
2. Assigns role  
3. Defines access scope  
4. System validates consistency  
5. Permissions are updated. 
Post condition Access control policies are updated; Unauthorized access is restricted. 
 
 
4.4.6 Use Case: Register Blockchain Node 
This use case ensures that only verified cooperative or regulatory entities participate in consensus 
processes, thereby strengthening data immutability and auditability across the system. 
 
28 
 
 
 
Table 4.4.6-1 Registering Blockchain Node use case 
Field Details 
Use Case Register Blockchain Node 
Actors System Administrator 
Description Configures and maintains permissioned blockchain nodes representing cooperative or 
regulatory entities. 
Precondition Administrator has infrastructure-level access;  
Node credentials are available. 
Main Flow 1. Administrator registers new node  
2. System validates node identity  
3. Node is added to permissioned network  
4. Synchronization with ledger occurs. 
Post condition Node becomes an active participant in consensus; Distributed ledger integrity is 
maintained. 
 
  
29 
 
 
 
 
 
  
Figure 4.4.6-1 Use case of Diagram of CoffeeChain system 
4.5 Sequence Diagrams 
A sequence of diagrams refers to a series of visual representations that illustrate a process, 
progression or transformation of a system, concept or set of data over time or steps. Figures 4.2 
through Figure 4.5 are some of sequence diagrams for the CoffeeChain blockchain based system. 
Figure 4.4.6-2 Production logging 
30 
Figure 4.4.6-3 Record Fertilizer distribution with USSD farmer confirmation 
31 
Figure 4.4.6-4 Managing user account sequence diagram 
32 
4.6 Class Diagrams 
A UML Class diagram as shown in Figure 4.6 that represents the structure of a system by showing 
its 
classes, attributes, methods and relationships (such as inheritance, association and 
dependencies). It is used in object-oriented design to model software architecture. Figure 4.6 
CoffeeChain system Class Diagram. 
Figure 4.4.6-5 CoffeeChain system class diagram 
33 
4.7 Entity Relationship Diagram (ERD) 
The ERD illustrates database structure including: 
Entities: 
 Users 
 Farmers 
 Production 
 Inputs 
 Blockchain_Transactions 
 Audit_Logs 
Primary keys and foreign keys establish relationships between farmers and transactions (Refer to 
Figure 4.6). 
34 
Table 4.4.6-2 Entity Relationship Diagram illustrating database structure 
35 
4.8 Database Architecture 
Database architecture refers to the high-level design of the database system including the 
conceptual, logical, and physical levels of data organization. A database stores information and 
helps access data quickly and securely. 
CoffeeChain adopts a three-tier architecture consisting of: 
1. Presentation Layer (Frontend Web Interface) 
2. Application Layer (Backend & Blockchain Logic) 
3. Data Layer (Relational Database + Permissioned Blockchain Network) 
The relational database stores structured cooperative data, while the permissioned blockchain 
stores cryptographic hashes of critical transactions to ensure immutability and transparency. 
This architecture ensures: 
● Secure data handling 
● Clear separation of concerns 
● Scalability for future cooperative expansion 
● Integration of blockchain without replacing the relational database 
Figure 4.7 illustrates the CoffeeChain system architecture. 
36 
References 
FurtherAfrica. (2023, October 4). Dimitra: Applying Blockchain to Redefine Agriculture in Africa. 
Retrieved from FurtherAfrica: https://furtherafrica.com/2023/10/04/dimitra-applying
blockchain-to-redefine-agriculture-in-africa/ 
Nations, F. a. (2019). Blockchain Application in Agriculture: Opportunities and Challenges. 
Rome: FA0. 
Nations, F. a. (2022). The State of Food and Agriculture 2022: Leveraging Digital Technologies 
for Agricultural Transformation. Rome: FAO. 
37             now there have been modifications made thats why i need you the modifications are the actors flow form suppliers to retailers and cooperatives . so i need a frontend hoope you understand these tweaks as shown below This addition of OTP (One-Time Password) Verification is the perfect "last-mile" security measure. It bridges the gap between the digital ledger and the physical person, ensuring that a retailer or cooperative officer cannot "ghost" a distribution—meaning they cannot claim they gave fertilizer to a farmer who never actually showed up.

In your Figma design, this needs to be a high-engagement interaction. Here is the final, detailed plan for the Farmer OTP Verification Flow.

1. The "Farmer Receipt" UI Interaction
In the Retailer/AMCOS dashboard, when the officer selects a farmer and enters the number of bags, the "Save" button should be replaced by a "Request Verification / Omba Uhakiki" button.

The Flow:

Input: The Retailer enters the Farmer ID.

Trigger: The system pulls the farmer's registered phone number and displays: "SMS code will be sent to 071x-xxx-xxx / SMS itatumwa kwenda..."

The OTP Modal: A pop-up appears with four large digit boxes.

Farmer Action: The farmer receives the SMS and reads the 4-digit code to the Retailer.

Finalization: Once the correct code is entered, the "Commit to Ledger" animation triggers, anchoring the transaction to the blockchain.

2. Revised Sidebar & Navigation for the Whole System
Here is how the navigation bars must look to cover this specific OTP and warehouse-to-retailer flow:

A. Supplier (Warehouse/Factory)
Inventory / Ghala: Manage bulk fertilizer stock.

Batch Dispatch / Tuma Shehena: Assign batches to registered Retailers or AMCOS.

Traceability / Ufuatiliaji: View which Retailer has confirmed receipt of which batch.

B. Retailer & AMCOS (The Point of Sale/Distribution)
My Stock / Stoku Yangu: Shows batches received and verified from the Supplier.

New Distribution / Toa Mbolea: The main screen where the OTP verification happens.

Pending Confirmations / Uhakiki Unaoendelea: Records where an OTP was sent but not yet entered.

Farmer Registry / Daftari la Wakulima: List of farmers assigned to this shop/coop.

C. Regulatory Authority (National Admin/Auditor)
Audit Dashboard / Ukaguzi: Overall completion rates.

OTP Success Rate: A metric showing how many distributions were verified via OTP vs. manual overrides (if allowed).

Discrepancy Alerts: Flags if a Retailer claims they distributed more bags than they actually confirmed receiving.

3. The "Farmer-Centric" Figma Prompt
Role: Senior UX Designer for Secure Government Systems.
Context: Finalize the CoffeeChain design for the Kagera Region, specifically focusing on the Farmer OTP Verification Step.

1. The Distribution Form (Retailer/AMCOS View):

Fields: Farmer ID (Searchable), Fertilizer Type (Dropdown), Quantity in Bags (Number).

The 'Send OTP' Button: A prominent button labeled "Send Verification SMS / Tuma SMS ya Uhakiki".

The Verification UI: A sleek modal overlay that appears after clicking. It features 4 large input circles for the OTP.

Bilingual Feedback: Below the OTP boxes, show: "Ask the farmer for the code sent to their phone / Mwombe mkulima namba aliyotumiwa kwenye simu yake."

2. Visualizing the "Audit Anchor":

Once the OTP is verified, show a "Locking Animation". A shield or padlock icon closes, and a text label appears: "Record Authenticated by Farmer & Secured on Ledger / Kumbukumbu imethibitishwa na Mkulima na kufungwa."

3. Admin Visibility (National Level):

Create a "Transparency Widget" for the Auditor. It should show a bar chart of:

Bags Dispatched (Supplier) ➔ Bags Received (Retailer) ➔ Bags Verified (Farmer OTP).

If the Bags Verified number is lower than Bags Received, highlight the gap in Red to indicate potential fraud.

4. Mobile Responsiveness:

Since Retailers and AMCOS officers might use tablets or phones, ensure the OTP screen has a large numeric keypad layout for easy entry in field conditions.

4. Why the OTP is Critical for your Project (Specific Objective 3)
In your report, you can now state that your system solves the "Paper Records" problem by using Multi-Factor Authentication (MFA).

The Database stores the fact that 5 bags were moved.

The OTP proves the farmer actually received them.

The Blockchain anchors this proof so the Retailer cannot go back later and delete the record to hide stolen stock.

Would you like me to draft the "Success/Error" toast notification messages for the OTP screen in both English and Swahili?         Revised Project Direction – CoffeeChain 
Following the insights and feedbacks we got from our research study at TFRA and TFC we 
decided to change the project from dealing only with the cooperatives in tracking the 
distribution of fertilizers and decided to pivot the monitoring, tracing and overseeing the 
distribution of agriculture supply chain particularly fertilizers.   
1. Revised Project Positioning 
The project scope was refined after identifying the existence of government-operated 
fertilizer tracking systems. Rather than duplicating existing functionality, the revised 
project focuses on blockchain-enabled traceability and auditability across the fertilizer 
supply chain. 
The revised system supports tracking fertilizer movement from suppliers to cooperatives, 
retailers, and ultimately farmers while ensuring tamper-evident transaction verification. 
2. Revised Proposed Title 
“CoffeeChain: Design and Implementation of a Blockchain-Enabled Fertilizer Supply 
Traceability and Distribution Audit Platform for Agricultural Supply Chains.” 
3. Revised Problem Statement 
Fertilizer distribution involves multiple actors including suppliers, retailers, cooperatives, 
and farmers. Existing systems still face challenges related to fragmented visibility, 
inconsistent verification, and limited traceability of fertilizer movement across the supply 
chain. 
The revised CoffeeChain platform introduces a permissioned blockchain-backed audit layer 
that records and verifies fertilizer movement while maintaining operational efficiency 
through conventional database storage. 
4. Revised Objectives 
Objective Type 
General Objective 
Description 
To design and implement a blockchain
enabled fertilizer supply traceability and 
audit platform. 
Specific Objective 1 
To record fertilizer batch registration and 
distribution transactions. 
Specific Objective 2 
To provide immutable verification of 
fertilizer transfer records. 
Specific Objective 3 
To support farmer-level fertilizer 
distribution logging. 
Specific Objective 4 
To generate auditable reports for oversight 
and accountability. 
5. Refined Project Scope 
 Fertilizer batch registration 
 Distribution tracking between suppliers, retailers, cooperatives, and farmers 
 Receipt verification 
 Blockchain anchoring of critical transactions 
 Audit and reporting functionality 
The project excludes payment systems, transportation optimization, cryptocurrency 
mechanisms, and national-scale procurement automation. 
6. Revised System Actors 
Actor 
Supplier 
Role 
Registers fertilizer batches and initiates 
distribution. 
Retailer / Agro-Dealer 
Cooperative (AMCOS) 
Receives and redistributes fertilizer stock. 
Coordinates fertilizer allocation to farmers. 
Farmer 
Regulatory Authority 
Confirms fertilizer receipt and usage. 
Audits and verifies distribution records. 
System Administrator 
Maintains the platform and blockchain 
nodes. 
7. Development Methodology 
The project adopts an Iterative Incremental development methodology inspired by Agile 
principles. Modules are developed and validated progressively before blockchain 
integration is introduced. 
8. Hybrid System Architecture 
CoffeeChain utilizes a hybrid architecture where operational records are stored in a 
conventional database while cryptographic hashes of critical transactions are anchored to a 
permissioned blockchain ledger. 
 Operational Database: Stores user accounts, inventory records, and reports. 
 Permissioned Blockchain: Stores transaction hashes and verification records. 
 Application Layer: Handles validation, access control, and reporting. 
9. Revised Core Use Cases 
1. Register Fertilizer Batch 
2. Transfer Fertilizer Inventory 
3. Confirm Receipt of Fertilizer 
4. Log Farmer-Level Distribution 
5. Verify Batch Authenticity 
6. Generate Distribution Audit Reports         i need the full project from log in to every task it should be available with a good division of roles so you will give credentials to log in as certian role something like such go on use appropriate colors for it deals with agriculture and fertilizers in tanzania the use of pictures if necessary just give me the frontend
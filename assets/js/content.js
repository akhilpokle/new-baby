// content.js — Newborn MTM letter content, one template per audience.
//
// SOURCE OF TRUTH: assets/newborn_mtm_templates.json — this file is a verbatim
// JS copy of it. Edit the JSON first, then mirror the change here.
//
// Why a .js copy instead of fetching the .json: the prototype must run by
// double-clicking index.html, and fetch() of a local file is blocked by CORS
// under file:// (same reason app.js can't be type="module" — docs/gotchas.md #1).
// At Liferay handoff this whole object is replaced by CMS-rendered content.
//
// Shape: templates[] — each is a COMPLETE, pre-resolved letter for one audience
// (gender × employmentType). Sections are already filtered per audience by the
// content team, so rendering is "find the matching template and lay out its
// sections in order" — no eligibility logic lives in the front end.
//
// TODO(api): replace the |Employee Name| placeholder with the Workday value.

'use strict';

// CMS: newborn MTM letter templates
window.NEWBORN_CONTENT = {
	documentSet: 'Newborn MTM (Moments That Matter) Communications',
	source: 'DBS',
	templates: [
		{
			title: 'Newborn MTM for Male Perm Staff',
			audience: { gender: 'Male', employmentType: 'Permanent Staff' },
			greeting: 'Dear |Employee Name|,',
			intro: "Our heartiest congratulations on the arrival of your little bundle of joy! This is truly a special time, and we hope you've been able to enjoy these precious moments with your new family. Here's some ways we wish to support you and your family on this journey.",
			sections: [
				{
					heading: 'More time with the little one',
					body: 'Cherish the moments with the new addition to your family with your Paternity, Shared Parental and Enhanced Childcare leave.',
					links: [
						{
							label: 'Apply for leave now',
							url: 'https://wd3.myworkday.com/dbs/d/inst/13102!CK5mGhIKBgqDEMenAhIICgYl1A0QjQM~/cacheable-task/23748$9.htmld#TABINDEX=0',
						},
					],
				},
				{
					heading: 'Medical Protection for your newborn',
					body: 'The bank provides core medical plan for all eligible dependants of permanent employees.',
					links: [
						{
							label: "Update your dependant's details in People Hub, including their NRIC/FIN number",
							linkText: 'Workday dbs',
						},
						{
							label: 'More info on medical benefits here',
							linkText: 'ServiceTemplate',
						},
					],
				},
				{
					heading: 'Pregnancy/new-born related claims',
					body: 'Maternity Care: You will receive S$5,000 per newborn as reimbursement to help you defray the related medical expenses of giving birth to a newborn in Singapore or overseas, covering:',
					coverage: [
						'Pre-natal and post-natal',
						'Delivery of the newborn',
						'Paediatric care for the newborn within the first 14 days',
					],
					note: 'If both parents are employees of DBS, only one claim is allowed per newborn.',
					links: [
						{
							label: 'Submit Claim',
							url: 'rafflesone.rafflesmedical.com/MediAccess/SSO/DBSLogin',
						},
					],
				},
				{
					heading: 'Discover other benefits',
					body: 'Find out the full suite of benefits, including Flexible Work Arrangements, Staff Deals and more:',
					links: [
						{ label: 'Parental Benefits' },
						{ label: 'Flexible Work Arrangements' },
						{ label: 'Staff Deals', linkText: 'Deals' },
					],
				},
				{
					heading: 'Be cared for and supported',
					body: "Navigating life's milestones can bring about exciting change and sometimes daunting transitions – iOK offers space to talk things through, whatever you may be experiencing. Access iOK here.",
					links: [
						{
							label: 'Access iOK here',
							linkText: 'Department Information Template',
						},
					],
				},
			],
		},
		{
			title: 'Newborn MTM for Male Direct Contract',
			audience: { gender: 'Male', employmentType: 'Direct Contract' },
			greeting: 'Dear |Employee Name|,',
			intro: "Our heartiest congratulations on the arrival of your little bundle of joy! This is truly a special time, and we hope you've been able to enjoy these precious moments with your new family. As you return to work, here's some ways we wish to support you and your family on this journey.",
			sections: [
				{
					heading: 'More time with the little one',
					body: 'Cherish the moments with the new addition to your family with your Paternity, Shared Parental and Enhanced Childcare leave.',
					note: 'You are required to have a minimum 90 calendar days of continuous service before the birth of your child to be eligible for paid Paternity and Shared Parental Leave.',
					links: [
						{
							label: 'Apply for leave now',
							url: 'https://wd3.myworkday.com/dbs/d/inst/13102!CK5mGhIKBgqDEMenAhIICgYl1A0QjQM~/cacheable-task/23748$9.htmld#TABINDEX=0',
						},
					],
				},
				{
					heading: 'Pregnancy/new-born related claims',
					body: 'Maternity Care: You will receive S$5,000 per newborn as reimbursement to help you defray the related medical expenses of giving birth to a newborn in Singapore or overseas, covering:',
					coverage: [
						'Pre-natal and post-natal',
						'Delivery of the newborn',
						'Paediatric care for the newborn within the first 14 days',
					],
					note: 'If both parents are employees of DBS, only one claim is allowed per newborn.',
					links: [
						{
							label: 'Submit Claim',
							url: 'rafflesone.rafflesmedical.com/MediAccess/SSO/DBSLogin',
						},
					],
				},
				{
					heading: 'Discover other benefits',
					body: 'Find out the full suite of benefits, including Flexible Work Arrangements, Staff Deals and more:',
					links: [
						{ label: 'Parental Benefits' },
						{ label: 'Flexible Work Arrangements' },
						{ label: 'Family Deals', linkText: 'Deals' },
					],
				},
				{
					heading: 'Be cared for and supported',
					body: "Navigating life's milestones can bring about exciting change and sometimes daunting transitions – iOK offers space to talk things through, whatever you may be experiencing. Access iOK here.",
					links: [
						{
							label: 'Access iOK here',
							linkText: 'Department Information Template',
						},
					],
				},
			],
		},
		{
			title: 'Newborn MTM for Female Perm Staff',
			audience: { gender: 'Female', employmentType: 'Permanent Staff' },
			greeting: 'Dear |Employee Name|,',
			intro: "Our heartiest congratulations on the arrival of your little bundle of joy! This is truly a special time, and we hope you've been able to enjoy several precious moments with your new family. As you return to work, here's some ways we wish to support you and your family on this journey.",
			sections: [
				{
					heading: 'More time with the little one',
					body: 'Cherish the moments with the new addition to your family with your Maternity Leave, Shared Parental and Enhanced Childcare leave.',
					links: [
						{
							label: 'Apply for leave now',
							url: 'https://wd3.myworkday.com/dbs/d/inst/13102!CK5mGhIKBgqDEMenAhIICgYl1A0QjQM~/cacheable-task/23748$9.htmld#TABINDEX=0',
						},
					],
				},
				{
					heading: 'Medical Protection for your newborn',
					body: "The bank provides core medical plan for all eligible dependants of permanent employees. You may opt to enrol them on a higher plan during the annual enrolment period or when there is a life event change, subject to underwriting and approval by the insurer. Make sure they're covered, and enrol them under our medical plans today:",
					links: [
						{
							label: "Update your dependant's details in People Hub, including their NRIC/FIN number",
							linkText: 'Workday dbs',
						},
						{
							label: 'More info on medical benefits here',
							linkText: 'ServiceTemplate',
						},
					],
				},
				{
					heading: 'Pregnancy/new-born related claims',
					body: 'Maternity Care: You will receive S$5,000 per newborn as reimbursement to help you defray the related medical expenses of giving birth to a newborn in Singapore or overseas, covering:',
					coverage: [
						'Pre-natal and post-natal',
						'Delivery of the newborn',
						'Paediatric care for the newborn within the first 14 days',
					],
					note: 'If both parents are employees of DBS, only one claim is allowed per newborn.',
					links: [
						{
							label: 'Submit Claim',
							url: 'rafflesone.rafflesmedical.com/MediAccess/SSO/DBSLogin',
						},
					],
				},
				{
					heading: 'Returning to office – get access to nursing rooms',
					body: 'Nursing rooms are spaces to provide a supportive environment for nursing mothers. Find out more and apply for access below.',
					links: [
						{ label: 'Nursing Rooms: Department Information Template' },
					],
				},
				{
					heading: 'Discover other benefits',
					body: 'Find out the full suite of benefits, including Flexible Work Arrangements, Staff Deals and more:',
					links: [
						{ label: 'Parental Benefits' },
						{ label: 'Flexible Work Arrangements' },
						{ label: 'Family Deals', linkText: 'Deals' },
					],
				},
				{
					heading: 'Be cared for and supported',
					body: "Navigating life's milestones can bring about exciting change and sometimes daunting transitions – iOK offers space to talk things through, whatever you may be experiencing. Access iOK here.",
					links: [
						{
							label: 'Access iOK here',
							linkText: 'Department Information Template',
						},
					],
				},
			],
		},
		{
			title: 'Newborn MTM for Female Direct Contract',
			audience: { gender: 'Female', employmentType: 'Direct Contract' },
			greeting: 'Dear |Employee Name|,',
			intro: "Our heartiest congratulations on the arrival of your little bundle of joy! This is truly a special time, and we hope you've been able to enjoy several precious moments with your new family. As you return to work, here's some ways we wish to support you and your family on this journey.",
			sections: [
				{
					heading: 'More time with the little one',
					body: 'Cherish the moments with the new addition to your family with your Maternity, Shared Parental and Enhanced Childcare leave.',
					note: 'You are required to have a minimum 90 calendar days of continuous service before the birth of your child to be eligible for paid Maternity and Shared Parental Leave.',
					links: [
						{
							label: 'Apply for leave now',
							url: 'https://wd3.myworkday.com/dbs/d/inst/13102!CK5mGhIKBgqDEMenAhIICgYl1A0QjQM~/cacheable-task/23748$9.htmld#TABINDEX=0',
						},
					],
				},
				{
					heading: 'Pregnancy/new-born related claims',
					body: 'Maternity Care: You will receive S$5,000 per newborn as reimbursement to help you defray the related medical expenses of giving birth to a newborn in Singapore or overseas, covering:',
					coverage: [
						'Pre-natal and post-natal',
						'Delivery of the newborn',
						'Paediatric care for the newborn within the first 14 days',
					],
					note: 'If both parents are employees of DBS, only one claim is allowed per newborn.',
					links: [
						{
							label: 'Submit Claim',
							url: 'rafflesone.rafflesmedical.com/MediAccess/SSO/DBSLogin',
						},
					],
				},
				{
					heading: 'Returning to office – get access to nursing rooms',
					body: 'Nursing rooms are spaces to provide a supportive environment for nursing mothers. Find out more and apply for access below.',
					links: [
						{ label: 'Nursing Rooms: Department Information Template' },
					],
				},
				{
					heading: 'Discover other benefits',
					body: 'Find out the full suite of benefits, including Flexible Work Arrangements, Staff Deals and more:',
					links: [
						{ label: 'Parental Benefits' },
						{ label: 'Flexible Work Arrangements' },
						{ label: 'Family Deals', linkText: 'Deals' },
					],
				},
				{
					heading: 'Be cared for and supported',
					body: "Navigating life's milestones can bring about exciting change and sometimes daunting transitions – iOK offers space to talk things through, whatever you may be experiencing. Access iOK here.",
					links: [
						{
							label: 'Access iOK here',
							linkText: 'Department Information Template',
						},
					],
				},
			],
		},
	],
};

// Illustration per section heading. The art is persona-stable — the same section
// always uses the same illustration, whichever template it appears in — so this
// maps by heading rather than being duplicated into every template above.
//
// Filenames are kebab-case on purpose: GitHub Pages serves from a case-sensitive
// filesystem and spaces need URL-encoding, so "More time.jpg" is a 404 waiting to
// happen on the live preview (docs/gotchas.md #11). Keep new art to this pattern.
//
// NOTE: keyed by heading text — reword a heading in the templates above and the
// illustration silently drops out. Stable section IDs would be the better key if
// the CMS provides them at handoff.
window.NEWBORN_ILLUSTRATIONS = {
	'More time with the little one':                     'assets/img/more-time.jpg',
	'Medical Protection for your newborn':               'assets/img/medical-protection.jpg',
	'Pregnancy/new-born related claims':                 'assets/img/claims.jpg',
	'Returning to office – get access to nursing rooms': 'assets/img/nursing-room.jpg',
	'Discover other benefits':                           'assets/img/other-benefits.jpg',
	'Be cared for and supported':                        'assets/img/care-and-support.jpg',
};

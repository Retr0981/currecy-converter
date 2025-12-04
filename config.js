// Enhanced field name aliases for matching
// REMOVED generic terms like 'name' and 'fullName' that caused false matches
const FIELD_ALIASES = {
  // Personal Information
  firstName: [
    'firstName', 'first_name', 'firstname', 'fname', 'givenName', 'given_name',
    'forename', 'user.firstName', 'customer.firstName', 'applicant.firstName',
    'candidate.firstName', 'first', 'fn', 'given', 'fName', 'firstName1',
    'firstname1', 'name_first'
  ],
  
  lastName: [
    'lastName', 'last_name', 'lastname', 'lname', 'surname', 'familyName',
    'family_name', 'user.lastName', 'customer.lastName', 'applicant.lastName',
    'candidate.lastName', 'last', 'ln', 'family', 'lName', 'lastname1', 'name_last'
  ],
  
  fullName: [
    'fullName', 'full_name', 'fullname', 'completeName', 'displayName',
    'user.name', 'customer.name', 'applicant.name', 'candidate.name',
    'person.name', 'display_name'
  ],
  
  email: [
    'email', 'e-mail', 'emailAddress', 'email_address', 'e_mail', 'mail',
    'e mail', 'emailaddress', 'contactEmail', 'candidate.email', 'applicant.email',
    'user.email', 'person.email', 'contact_email', 'emailAddr', 'mailAddress',
    'e-mailAddress', 'email_addr'
  ],
  
  phone: [
    'phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile', 'cell',
    'cellphone', 'phonenumber', 'tel', 'contactNumber', 'candidate.phone',
    'applicant.phone', 'user.phone', 'person.phone', 'contact_phone', 'phone_no',
    'telephone_no', 'mobileNumber', 'phoneNumber1', 'telephoneNumber', 'mobilePhone'
  ],
  
  // Address Information
  address: [
    'address', 'streetAddress', 'street_address', 'addressLine1', 'address1',
    'line1', 'street', 'mailingAddress', 'residentialAddress', 'homeAddress',
    'workAddress', 'address_line1', 'addr1', 'streetAddr', 'addrLine1'
  ],
  
  city: [
    'city', 'town', 'cityName', 'locality', 'addressCity', 'homeCity',
    'workCity', 'city_name', 'locationCity', 'address_city', 'cityTown',
    'city_town', 'locality_city'
  ],
  
  state: [
    'state', 'province', 'region', 'stateProvince', 'addressState', 'homeState',
    'workState', 'state_name', 'regionState', 'address_state', 'stateProv',
    'provState', 'state_province', 'region_state'
  ],
  
  zipCode: [
    'zip', 'zipCode', 'zipcode', 'postalCode', 'postal', 'postcode',
    'addressZip', 'homeZip', 'workZip', 'zip_code', 'postal_code',
    'address_zip', 'postCode', 'zipPostal', 'zip_postal'
  ],
  
  country: [
    'country', 'countryName', 'nation', 'addressCountry', 'homeCountry',
    'workCountry', 'country_name', 'nationality', 'address_country'
  ],
  
  // Professional Information
  company: [
    'company', 'organization', 'employer', 'companyName', 'company_name',
    'organizationName', 'currentCompany', 'employerName', 'companyName1',
    'compName', 'orgName', 'employer_name', 'current_employer'
  ],
  
  jobTitle: [
    'jobTitle', 'job_title', 'position', 'title', 'role', 'occupation',
    'jobPosition', 'jobRole', 'jobtitle', 'jobName', 'designation',
    'currentTitle', 'current_position', 'professional_title', 'role_title'
  ],
  
  // Additional Fields
  website: [
    'website', 'personalWebsite', 'portfolio', 'url', 'websiteUrl',
    'webSite', 'personal_site', 'portfolio_url', 'website_url'
  ],
  
  linkedin: [
    'linkedin', 'linkedinProfile', 'linkedin_url', 'linkedinUrl',
    'social.linkedin', 'linkedin_profile', 'linkedin_link'
  ],
  
  github: [
    'github', 'githubProfile', 'github_url', 'githubUrl', 'social.github',
    'github_profile', 'github_link'
  ],
  
  // Employment Details
  experience: [
    'experience', 'workExperience', 'yearsExperience', 'totalExperience',
    'professionalExperience', 'relevantExperience', 'years_experience',
    'total_experience', 'work_experience'
  ],
  
  education: [
    'education', 'degree', 'qualification', 'highestEducation',
    'educationalBackground', 'academicBackground', 'highest_degree',
    'education_level'
  ],
  
  skills: [
    'skills', 'technicalSkills', 'competencies', 'expertise', 'abilities',
    'proficiencies', 'technical_skills', 'key_skills', 'core_skills'
  ],
  
  salary: [
    'salary', 'salaryExpectation', 'expectedSalary', 'compensation',
    'desiredSalary', 'salary_expectation', 'expected_salary',
    'compensation_expectation'
  ],
  
  notice: [
    'noticePeriod', 'notice', 'availability', 'whenAvailable',
    'notice_period', 'availability_date', 'start_date', 'joining_date'
  ]
};
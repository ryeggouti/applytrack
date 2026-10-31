import {test} from 'node:test';
import assert from 'node:assert/strict';
import {academicURL,rootDomain,sameInstitution} from '../lib/urls.mjs';
test('accepts academic suffixes and listed university domains',()=>{
 for(const url of ['https://admissions.yale.edu/','https://www.imperial.ac.uk/study/','https://future.utoronto.ca/apply','https://www.mcgill.ca/undergraduate-admissions/','https://ethz.ch/en/studies.html','https://www.uni-heidelberg.de/en/study','https://www.aui.ma/admissions','https://mitadmissions.org/apply/'])
  assert.doesNotThrow(()=>academicURL(url),url);
});
test('rejects non-university and insecure addresses',()=>{
 for(const url of ['https://uni-anything.de/','https://admissions.universite-madeup.fr/','https://uni-heidelberg.de.evil.com/','https://example.com/','http://admissions.yale.edu/','https://utoronto.ca.evil.com/','https://notutoronto.ca/','https://user:pw@yale.edu/'])
  assert.throws(()=>academicURL(url),url);
});
test('keeps crawling within the same institution',()=>{
 assert.equal(rootDomain('future.utoronto.ca'),'utoronto.ca');
 assert.equal(rootDomain('www.imperial.ac.uk'),'imperial.ac.uk');
 assert.ok(sameInstitution(new URL('https://www.utoronto.ca/x'),'utoronto.ca'));
 assert.ok(!sameInstitution(new URL('https://www.ubc.ca/x'),'utoronto.ca'));
});

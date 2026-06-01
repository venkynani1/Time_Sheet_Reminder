// Handles team-member CRUD API requests.
const { prisma } = require('../services/dataService');
const memberService = require('../services/memberService');

async function list(req, res, next) { try { res.json(await prisma.member.findMany()); } catch (error) { next(error); } }
async function create(req, res, next) {
  try { const error = memberService.validateMember(req.body); if (error) return res.status(400).json({ error }); res.status(201).json(await memberService.addMember(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
}
async function update(req, res, next) {
  try { const error = memberService.validateMember(req.body); if (error) return res.status(400).json({ error }); const member = await memberService.updateMember(req.params.id, req.body); member ? res.json(member) : res.status(404).json({ error: 'Member not found.' }); } catch (error) { res.status(400).json({ error: error.message }); }
}
async function remove(req, res, next) {
  try { (await memberService.deleteMember(req.params.id)) ? res.status(204).end() : res.status(404).json({ error: 'Member not found.' }); } catch (error) { next(error); }
}
async function importCsv(req, res, next) {
  try { if (typeof req.body.csv !== 'string') return res.status(400).json({ error: 'CSV content is required.' }); const members = await memberService.importCsv(req.body.csv); res.status(201).json({ importedCount: members.length, members }); } catch (error) { res.status(400).json({ error: error.message }); }
}

module.exports = { create, importCsv, list, remove, update };

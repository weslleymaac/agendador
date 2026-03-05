import { Router } from 'express';
import * as agendamentosController from '../controllers/agendamentos.js';
import {
  createAgendamentoRules,
  updateAgendamentoRules,
  idParamRules,
  listQueryRules,
  handleValidation,
} from '../middleware/validate.js';

const router = Router();

router.post(
  '/',
  createAgendamentoRules,
  handleValidation,
  agendamentosController.create
);

router.get(
  '/',
  listQueryRules,
  handleValidation,
  agendamentosController.list
);

router.get(
  '/:id',
  idParamRules,
  handleValidation,
  agendamentosController.getById
);

router.put(
  '/:id',
  updateAgendamentoRules,
  handleValidation,
  agendamentosController.update
);

router.delete(
  '/:id',
  idParamRules,
  handleValidation,
  agendamentosController.remove
);

export default router;

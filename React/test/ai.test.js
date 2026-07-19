import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeChatEvent, taskFromChatEvent } from '../src/api/modules/ai.js'

test('normalizeChatEvent preserves the complete interrupt payload', () => {
  const interrupt = {
    type: 'interrupt',
    conversationId: 'conversation-1',
    interrupts: [{
      id: 'interrupt-1',
      title: 'Confirm registration',
      summary: 'Book a cardiology appointment',
      args: { departmentId: 12 },
      allowedDecisions: ['approve', 'reject', 'edit'],
    }],
  }

  assert.deepEqual(normalizeChatEvent(interrupt), interrupt)
})

test('taskFromChatEvent ignores unknown and clinician-only events', () => {
  assert.equal(taskFromChatEvent({ type: 'tool', task: { type: 'prescription' } }), null)
  assert.deepEqual(taskFromChatEvent({ type: 'tool', task: { type: 'payment', chargeId: 8 } }), { type: 'payment', chargeId: 8 })
})

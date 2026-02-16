'use client'

import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Task } from '@/app/page'

export default function TaskList({ tasks, onTaskUpdated }: { tasks: Task[], onTaskUpdated: () => void }) {
    const supabase = createClient()

    const toggleStatus = async (task: Task) => {
        const newStatus = task.status === 'Todo' ? 'Done' : 'Todo'
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', task.id)

        if (error) {
            alert('Error updating status: ' + error.message)
        } else {
            onTaskUpdated()
        }
    }

    const deleteTask = async (id: string) => {
        if (!confirm('本当にこのタスクを削除しますか？')) return
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        if (error) {
            alert('Error deleting task: ' + error.message)
        } else {
            onTaskUpdated()
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'text-red-600 bg-red-50 border-red-200'
            case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'Low': return 'text-green-600 bg-green-50 border-green-200'
            default: return 'text-gray-600'
        }
    }

    return (
        <ul className="space-y-4">
            {tasks.map((task) => (
                <li
                    key={task.id}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:shadow-md transition-shadow ${task.status === 'Done' ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
                >
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={task.status === 'Done'}
                                onChange={() => toggleStatus(task)}
                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <h3 className={`text-lg font-bold ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {task.title}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
                                {task.priority === 'High' ? '高' : task.priority === 'Medium' ? '中' : '低'}
                            </span>
                        </div>

                        {task.detail && (
                            <p className={`mt-1 ml-7 text-sm text-gray-600 ${task.status === 'Done' ? 'line-through' : ''}`}>
                                {task.detail}
                            </p>
                        )}

                        <div className="mt-2 ml-7 flex flex-wrap gap-4 text-xs text-gray-500">
                            {task.due_date && (
                                <span>期限: {format(new Date(task.due_date), 'yyyy年MM月dd日(EEE) HH:mm', { locale: ja })}</span>
                            )}
                            <span>登録日: {format(new Date(task.created_at), 'MM/dd')}</span>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-0 sm:ml-4 flex gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => deleteTask(task.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-3 py-1 border border-transparent hover:border-red-200 rounded transition-colors"
                        >
                            削除
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    )
}

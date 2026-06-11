import { useIsPc } from '../../hooks'
import ScheduleManagePc from './pc'
import ScheduleManageMobile from './mobile'

export default function ScheduleManage() {
  const isPc = useIsPc()
  return isPc ? <ScheduleManagePc /> : <ScheduleManageMobile />
}

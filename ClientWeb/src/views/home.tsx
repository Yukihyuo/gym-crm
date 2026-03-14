import AssistanceComponent from '@/components/user/AssistanceComponent'
import { useUserStore } from '@/store/userStore'
import MembershipUser from "@/components/user/MembershipUser"

export default function Home() {
  const {user} = useUserStore()
  return (
    <div>

      
      {user?.id ? <MembershipUser userId={user.id} /> : null}
      {user?.id ? <AssistanceComponent userId={user.id} /> : null}
    </div>
  )
}
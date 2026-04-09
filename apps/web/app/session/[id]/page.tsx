import InputBox from '@/app/_component/InputBox';
import PlanPannel from './_component/PlanPannel';

const SessionChatPage = () => {
  return (
    <div className="h-full w-full py-4 bg-muted">
      <div className="h-full w-4xl mx-auto flex flex-col gap-4">
        <h1 className="text-lg font-bold w-full overflow-hidden text-ellipsis whitespace-nowrap shrink-0">
          Title
        </h1>

        <section className="flex-1">content</section>

        <div className="shrink-0 space-y-2">
          <PlanPannel plan={null} />
          <InputBox />
        </div>
      </div>
    </div>
  );
};

export default SessionChatPage;

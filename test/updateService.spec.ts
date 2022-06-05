
import chai from 'chai';
import { appendFileSync } from 'original-fs';
import { EventService } from '../src/service/eventsService';
import { ReleaseItem, UpdateService } from '../src/service/updateService';
const expect = chai.expect;


describe('updateService ', async () => {


    before(async () => {
    })

    it('getReleaseList', async () => {
        const update = new UpdateService(new EventService());
        const items = await update.getReleaseList();
        expect(items.length).to.equal(2);
        expect(items.find(x => x.name == 'v0.0.0')).exist;
        expect(items.find(x => x.name == 'v0.0.1')).exist;
        expect(items.find(x => x.name == 'v0.0.0')?.assets.length).to.equal(1);
        expect(items.find(x => x.name == 'v0.0.0')?.assets[0].content_type.includes('debian')).to.be.true;


    })



    it('check will return a new version', async () => {


        // mock eventservice if emit is called
        class MockEventService extends EventService {
            isEmitted = false;
            emit(eventName: string, ...args: any[]): boolean {
                this.isEmitted = true;
                return true;
            }
        }

        // mock updateservice for getReleaseList
        class MockUpdateService extends UpdateService {
            async getReleaseList(): Promise<ReleaseItem[]> {
                return [
                    {
                        name: 'v5.0.0',
                        draft: false, prerelease: false,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_5.0.0.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    },
                    {
                        name: 'v5.0.1',
                        draft: false, prerelease: true,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_5.0.1.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    }
                ]
            }
        }

        //lets test with mocks
        // only one release is is suitable for linux
        const mockEventService = new MockEventService();
        const update = new MockUpdateService(mockEventService)
        const releases = await update.check();
        expect(releases).exist;
        expect(releases?.length).to.equal(1);
        if (releases)
            expect(releases[0].name).to.equal('v5.0.0');
        expect(mockEventService.isEmitted).to.be.true;

    })




    it('check will return the latest  version', async () => {


        // mock eventservice if emit is called
        class MockEventService extends EventService {
            isEmitted = false;
            emit(eventName: string, ...args: any[]): boolean {
                this.isEmitted = true;
                return true;
            }
        }

        // mock updateservice for getReleaseList
        class MockUpdateService extends UpdateService {
            async getReleaseList(): Promise<ReleaseItem[]> {
                return [
                    {
                        name: 'v5.0.0',
                        draft: false, prerelease: false,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_5.0.0.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    },
                    {
                        name: 'v5.0.1',
                        draft: false, prerelease: false,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_5.0.1.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    }
                ]
            }
        }
        //lets test with mocks
        // only one release is is suitable for linux
        const mockEventService = new MockEventService();
        const update = new MockUpdateService(mockEventService)
        const releases = await update.check();
        expect(releases).exist;
        expect(releases?.length).to.equal(2);
        if (releases) {
            expect(releases[0].name).to.equal('v5.0.1');
            expect(releases[1].name).to.equal('v5.0.0');
        }
        expect(mockEventService.isEmitted).to.be.true;

    })

    it('check will return nothing becuase of old versions', async () => {

        // mock eventservice if emit is called
        class MockEventService extends EventService {
            isEmitted = false;
            emit(eventName: string, ...args: any[]): boolean {
                this.isEmitted = true;
                return true;
            }
        }

        // mock updateservice for getReleaseList
        class MockUpdateService extends UpdateService {
            async getReleaseList(): Promise<ReleaseItem[]> {
                return [
                    {
                        name: 'v0.0.0',
                        draft: false, prerelease: false,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_0.0.0.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    },
                    {
                        name: 'v0.0.1',
                        draft: false, prerelease: false,
                        published_at: new Date().toISOString(),
                        publish_time: new Date().getTime(),
                        assets: [
                            {
                                name: 'ferrumgate_linux_amd64_0.0.1.deb', content_type: '', download_url: '', url: ''
                            }
                        ]
                    }
                ]
            }
        }
        //lets test with mocks
        // only one release is is suitable for linux
        const mockEventService = new MockEventService();
        const update = new MockUpdateService(mockEventService)
        const releases = await update.check();
        expect(releases).exist;
        expect(releases?.length).to.equal(0);

        expect(mockEventService.isEmitted).to.be.false;

    })

})